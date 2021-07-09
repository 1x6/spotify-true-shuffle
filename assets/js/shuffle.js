async function shuffle_retrieve_songs(playlist_id, on_progress_change) {
    // Check local cache first
    let cache = spotify_profile.playlist_songs[playlist_id];
    if (cache) return cache;

    // Retrieve From Spotify API
    let token = get_access_token();
    let songs = await fetch_all_playlist_songs(
        token,
        playlist_id,
        on_progress_change
    );

    spotify_profile.playlist_songs[playlist_id] = songs;
    return songs;
}

function shuffle_array(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function shuffle_and_play() {
    let playlist = $('#choose_playlist').val();
    let device = $('#choose_device').val();
    // let amount = $('#queue_amount').val();

    let playlist_object = spotify_profile.playlists_by_key[playlist];
    if (playlist == 'default' || playlist_object == undefined)
        return alert('Please Select a Valid Playlist');
    if (device == 'default') return alert('Please Select a Device');
    /* if (amount == 'default' || isNaN(+amount))
        return alert('Please Select A Valid Amount Of Songs To Shuffle');
    amount = +amount; */

    let play_button = $('#play_button');
    play_button.text('Processing').prop('disabled', true).addClass('disabled');

    // Retrieve songs from playlist
    let total = playlist_object.tracks.total;
    let songs = await shuffle_retrieve_songs(playlist, (progress) =>
        play_button.text(`Retrieving Songs... [${progress} / ${total}]`)
    );

    // Filter out is_local songs as they are not available across devices
    songs = songs.filter((song) => song.is_local === false);

    // Shuffle songs
    play_button.text('Shuffling Songs');
    shuffle_array(songs);

    // Only do 99 songs at a time
    if (songs.length > 99) songs = songs.splice(0, 99);

    // Map song uris for Spotify API
    let song_uris = songs.map((song) => song.track.uri);

    // Launch Playback
    play_button.text('Starting Playback');
    let is_premium = await toggle_playback_shuffle(
        get_access_token(),
        device,
        false
    );

    if (!is_premium) {
        alert(
            'We are sorry but currently Spotify only allows users who have their premium subscription service to work with required API technologies that we use in this tool. For this reason, Spotify shuffle cannot work with your Spotify account.'
        );
        return play_button.text('Spotify Premium Required');
    }

    await start_playback(get_access_token(), device, {
        uris: song_uris,
    });

    let shuffle_results = [];
    songs.forEach(({ track }) => {
        let title = track.name;
        let artists = track.artists.map((artist) => artist.name).join(', ');
        let image;
        if (Array.isArray(track.album.images))
            image = track.album.images[0].url;

        shuffle_results.push(`
        <div class="row mt-3">
            <div class="song-element">
                ${
                    image
                        ? `<img
                class="song-image"
                src="${image}"
            />`
                        : ''
                }
                <p class="song-title">
                    ${title}<br /><strong class="song-subtitle"
                        >${artists}</strong
                    >
                </p>
            </div>
        </div>`);
    });

    $('#shuffle_results').html(shuffle_results.join('\n'));
    $('#shuffle_results_container').show();

    return play_button
        .text('Reshuffle & Play')
        .prop('disabled', false)
        .removeClass('disabled');

    /*

    // Splice songs array to requested shuffle amount of songs
    if (songs.length > amount) songs = songs.splice(0, amount);

    // Retrieve temporary playlist
    let playlist_object = spotify_profile.temporary.playlist;

    // Create a new temporary playlist if one doesn't already exist
    if (playlist_object === null) {
        play_button.text('Creating Temporary Playlist');
        playlist_object = await create_playlist(
            get_access_token(),
            spotify_profile.id,
            spotify_profile.temporary.name,
            'An Automatic Playlist Generated By True Shuffle from ' +
                location.origin +
                location.pathname,
            false
        );

        spotify_profile.temporary.playlist = playlist_object;
    }

    // Update temporary playlist with shuffled song uris
    play_button.text('Updating Temporary Playlist');
    await replace_songs_in_playlist(
        get_access_token(),
        playlist_object.id,
        song_uris
    );

    play_button.text('Starting Playback'); */
}
