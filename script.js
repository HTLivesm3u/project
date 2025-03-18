const SPOTIFY_CLIENT_ID = '7afe6b39346f4bcc8654c141fe2a6136';
const SPOTIFY_CLIENT_SECRET = '119278484c2f4c28ac893ea3324bfe84';
const YOUTUBE_API_KEY = 'AIzaSyAwKYDbklOiCO1o3Dr7uM-xISbjksPkgDk';

let spotifyToken = '';

// 🔹 1. Get Spotify Token
async function getSpotifyToken() {
    console.log("Fetching Spotify Token...");
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=client_credentials&client_id=${SPOTIFY_CLIENT_ID}&client_secret=${SPOTIFY_CLIENT_SECRET}`
    });

    const data = await response.json();
    spotifyToken = data.access_token;
    console.log("Spotify Token Received:", spotifyToken);
}

// 🔹 2. Search Song on Spotify
async function searchSongs() {
    const query = document.getElementById('search-query').value.trim();
    if (!query) return alert("Please enter a song name!");

    await getSpotifyToken();
    console.log("Searching on Spotify for:", query);

    const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`;
    const response = await fetch(spotifyUrl, {
        headers: { 'Authorization': `Bearer ${spotifyToken}` }
    });

    const data = await response.json();
    console.log("Spotify API Response:", data);

    if (data.tracks && data.tracks.items.length > 0) {
        displaySongs(data.tracks.items);
    } else {
        alert("No songs found on Spotify.");
    }
}

// 🔹 3. Display Songs & Fetch YouTube Video
async function displaySongs(songs) {
    const songList = document.getElementById('song-list');
    songList.innerHTML = '';

    for (let song of songs) {
        const title = song.name;
        const artist = song.artists[0].name;
        const albumCover = song.album.images[1]?.url || '';
        const previewUrl = song.preview_url;

        // 🔥 Find YouTube Video
        const videoId = await getYouTubeVideo(`${title} ${artist}`);

        const songItem = document.createElement('div');
        songItem.classList.add('song-item');

        songItem.innerHTML = `
            <img src="${albumCover}" alt="${title}">
            <p onclick="playYouTube('${videoId}')">${title} - ${artist}</p>
        `;

        songList.appendChild(songItem);
    }
}

// 🔹 4. Search YouTube Video
async function getYouTubeVideo(query) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.items.length > 0 ? data.items[0].id.videoId : null;
}

// 🔹 5. Play YouTube Video in iFrame
function playYouTube(videoId) {
    if (!videoId) {
        alert("No video found for this song.");
        return;
    }

    const player = document.getElementById('music-player');
    player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    player.style.display = 'block';
}
