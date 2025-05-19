const SPOTIFY_CLIENT_ID = '7afe6b39346f4bcc8654c141fe2a6136';
const SPOTIFY_CLIENT_SECRET = '119278484c2f4c28ac893ea3324bfe84';
const YOUTUBE_API_KEY = 'AIzaSyAwKYDbklOiCO1o3Dr7uM-xISbjksPkgDk';

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

document.getElementById('top-section').innerHTML = ''; // Remove heading + top songs

await getSpotifyToken();

const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`;
const spotifyResponse = await fetch(spotifyUrl, {
headers: { 'Authorization': `Bearer ${spotifyToken}` }
});

const spotifyData = await spotifyResponse.json();

if (spotifyData.tracks.items.length > 0) {
displaySongs(spotifyData.tracks.items, 'song-list');
} else {
alert("No results found on Spotify!");
}
}


// Display song results
async function displaySongs(songs) {
    const songList = document.getElementById('song-list');
    songList.innerHTML = '';

    for (let song of songs) {
        const title = song.name;
        const artist = song.artists[0].name;
        const albumCover = song.album.images[1].url;

        // Get YouTube Video ID
        const videoId = await getYouTubeVideo(`${title} ${artist}`);

        const songItem = document.createElement('div');
        songItem.classList.add('song-item');

        songItem.innerHTML = `
            <img src="${albumCover}" alt="${title}">
            <p>${title} - ${artist}</p>
        `;

        // Play song on click
        songItem.onclick = () => {
            if (videoId) {
                playYouTubeAudio(videoId, title, artist, albumCover);
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
function playYouTubeAudio(videoId, title, artist, albumCover) {
    const player = document.getElementById('music-player');
    player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1`;
    player.style.display = 'none';

    // Update footer info
    document.getElementById('footer-cover').src = albumCover || 'https://via.placeholder.com/50';
    document.getElementById('footer-title').textContent = title || 'Unknown';
    document.getElementById('footer-artist').textContent = artist || 'Unknown';

    // Set play icon to pause (because it's playing)
    const icon = document.getElementById('playPauseIcon');
    if (icon) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
    }
}

// Toggle play/pause icon only (since we're embedding YouTube, true control is limited)
function playPause() {
    const icon = document.getElementById('playPauseIcon');
    if (icon.classList.contains('fa-play')) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
    }
}

// On page load
window.onload = async () => {
await getSpotifyToken();
loadTopTrendingSongs();
};

// Load Top 10 Trending English Songs
async function loadTopTrendingSongs() {
const topSongsUrl = `https://api.spotify.com/v1/search?q=genre:pop&type=track&market=US&limit=10`;

try {
const response = await fetch(topSongsUrl, {
    headers: {
        'Authorization': `Bearer ${spotifyToken}`
    }
});

const data = await response.json();
if (data.tracks.items.length > 0) {
    displaySongs(data.tracks.items, 'top-songs');
}
} catch (error) {
console.error('Error loading top trending songs:', error);
}
}
window.lastVideoId = videoId; // Save last video ID

// Modified displaySongs to take container ID
async function displaySongs(songs, containerId = 'song-list') {
const songList = document.getElementById(containerId);
songList.innerHTML = '';

for (let song of songs) {
const title = song.name;
const artist = song.artists[0].name;
const albumCover = song.album.images[1]?.url || '';

// Get YouTube Video ID
const videoId = await getYouTubeVideo(`${title} ${artist}`);

const songItem = document.createElement('div');
songItem.classList.add('song-item');

songItem.innerHTML = `
    <img src="${albumCover}" alt="${title}">
    <p>${title} - ${artist}</p>
`;

songItem.onclick = () => {
    if (videoId) {
        playYouTubeAudio(videoId);
    } else {
        alert("No playable source found!");
    }
};

function playPause() {
    const icon = document.getElementById('playPauseIcon');
    const player = document.getElementById('music-player');

    if (icon.classList.contains('fa-pause')) {
        // Pause the music by stopping the iframe
        player.src = '';
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
    } else {
        // Resume not possible without full YouTube API, just reload
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        // NOTE: this reloads the last known video ID, which we need to store
        if (window.lastVideoId) {
            player.src = `https://www.youtube.com/embed/${window.lastVideoId}?autoplay=1&controls=0&showinfo=0&modestbranding=1&rel=0&playsinline=1`;
        }
    }
}


songList.appendChild(songItem);
}
}
