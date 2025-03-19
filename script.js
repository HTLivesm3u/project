        const SPOTIFY_CLIENT_ID = '7afe6b39346f4bcc8654c141fe2a6136';
        const SPOTIFY_CLIENT_SECRET = '119278484c2f4c28ac893ea3324bfe84';

        let spotifyToken = '';

        // Fetch Spotify Token (Needed for API Calls)
        async function getSpotifyToken() {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `grant_type=client_credentials&client_id=${SPOTIFY_CLIENT_ID}&client_secret=${SPOTIFY_CLIENT_SECRET}`
            });
            const data = await response.json();
            spotifyToken = data.access_token;
        }

        async function searchSongs() {
            const query = document.getElementById('search-query').value.trim();
            if (!query) return alert("Please enter a song name!");

            await getSpotifyToken(); // Ensure we have a valid Spotify token

            const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`;
            const spotifyResponse = await fetch(spotifyUrl, {
                headers: { 'Authorization': `Bearer ${spotifyToken}` }
            });
            const spotifyData = await spotifyResponse.json();

            if (spotifyData.tracks.items.length > 0) {
                displaySongs(spotifyData.tracks.items);
            } else {
                alert("No results found on Spotify!");
            }
        }

        function displaySongs(songs) {
            const songList = document.getElementById('song-list');
            songList.innerHTML = '';

            songs.forEach(song => {
                const title = song.name;
                const artist = song.artists[0].name;
                const albumCover = song.album.images[1].url;

                const songItem = document.createElement('div');
                songItem.classList.add('song-item');
                songItem.onclick = () => playYouTubeSong(`${title} ${artist}`);

                songItem.innerHTML = `
                    <img src="${albumCover}" alt="${title}">
                    <p>${title} - ${artist}</p>
                `;

                songList.appendChild(songItem);
            });
        }

        function playYouTubeSong(songName) {
            let searchQuery = songName.split(" ").join("+");
            let iframe = document.getElementById("music-player");
            iframe.src = `https://www.youtube.com/embed?listType=search&list=${searchQuery}&autoplay=1`;
            iframe.style.display = "block"; // Make iframe visible
        }
