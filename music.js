        const SPOTIFY_CLIENT_ID = '7afe6b39346f4bcc8654c141fe2a6136';
        const SPOTIFY_CLIENT_SECRET = '119278484c2f4c28ac893ea3324bfe84';
        const YOUTUBE_API_KEY = 'AIzaSyB4ekEujAe5s0HAyrhXSTafTS9kQqoSJwc';

        let spotifyToken = '';

        // Fetch Spotify API Token
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

        // Search for songs on Spotify
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

        // Display song results
       async function displaySongs(songs) {
    const songList = document.getElementById("song-list");
    songList.innerHTML = "";

    for (let song of songs) {
        const title = song.name;
        const artist = song.artists[0].name;
        const albumCover = song.album.images[1].url;
        const videoId = await getYouTubeVideo(`${title} ${artist}`);

        const songItem = document.createElement("div");
        songItem.classList.add("song-item");

        songItem.innerHTML = `
            <img src="${albumCover}" alt="${title}">
            <p>${title} - ${artist}</p>
        `;

        songItem.onclick = () => {
            if (videoId) {
                playYouTubeAudio(videoId, title, artist, albumCover);  // ✅ Pass song details
            } else {
                alert("No playable source found!");
            }
        };

        songList.appendChild(songItem);
    }
}

        // Fetch YouTube Video ID
        async function getYouTubeVideo(query) {
            try {
                const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
                const response = await fetch(url);
                const data = await response.json();
                return data.items.length > 0 ? data.items[0].id.videoId : null;
            } catch (error) {
                console.error("YouTube API Error:", error);
                return null;
            }
        }

        // Play Only Audio from YouTube
  let currentVideoId = null;
  let isPlaying = false;

  function playYouTubeAudio(videoId, title, artist, cover) {
    const player = document.getElementById("music-player");
    const footerCover = document.getElementById("footer-cover-image");
    const footerTitle = document.getElementById("footer-song-title");
    const footerArtist = document.getElementById("footer-artist-name");
    const playPauseBtn = document.getElementById("footer-play-pause");

    currentVideoId = videoId;
    isPlaying = true;

    // ✅ Set YouTube player URL with JavaScript API enabled
    player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1&loop=1&enablejsapi=1`;
    player.style.display = "none";  // Hide video player

    // ✅ Update footer details
    footerCover.src = cover;
    footerTitle.innerText = title;
    footerArtist.innerText = artist;
    playPauseBtn.innerText = "⏸";  // Show pause button
}

         document.getElementById("footer-play-pause").addEventListener("click", function () {
    const player = document.getElementById("music-player");
    
    if (!currentVideoId) return; // No song has been played yet

    if (isPlaying) {
        player.src = "";  // Stop the YouTube player
        this.innerText = "▶️";  // Change to play icon
    } else {
        player.src = `https://www.youtube.com/embed/${currentVideoId}?autoplay=1&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1&loop=1&enablejsapi=1`;
        this.innerText = "⏸";  // Change to pause icon
    }
    
    isPlaying = !isPlaying;  // Toggle state
});

let player;  // YouTube Player API instance
let isPlaying = false;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('music-player', {
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    console.log("YouTube Player Ready");
}

function onPlayerStateChange(event) {
    isPlaying = (event.data === YT.PlayerState.PLAYING);
    document.getElementById("footer-play-pause").innerText = isPlaying ? "⏸" : "▶️";
}

document.getElementById("footer-play-pause").addEventListener("click", function () {
    if (player && player.playVideo) {
        if (isPlaying) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    }
});
