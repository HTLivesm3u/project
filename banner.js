// script.js (Main Music45 App Logic)
import CONFIG from "./config.js";

const spotifyTokenUrl = "https://accounts.spotify.com/api/token";
const youtubeApiUrl = "https://www.googleapis.com/youtube/v3/search";

document.addEventListener("DOMContentLoaded", () => {
    // Buttons to load songs
    document.getElementById("load-spotify").addEventListener("click", () => 
        loadSongs("spotify")
    );

    document.getElementById("load-youtube").addEventListener("click", () => 
        loadSongs("youtube")
    );
});

// Load Songs from Spotify or YouTube
async function loadSongs(source) {
    const playlistElement = document.getElementById("playlist");
    playlistElement.innerHTML = "<li>Loading songs...</li>";

    try {
        let songs;
        if (source === "spotify") {
            songs = await fetchSpotifySongs();
        } else if (source === "youtube") {
            songs = await fetchYouTubeSongs();
        }

        playlistElement.innerHTML = ""; // Clear loading message

        songs.forEach(song => {
            const listItem = document.createElement("li");
            listItem.textContent = song.title;
            listItem.addEventListener("click", () => playSong(song.url));
            playlistElement.appendChild(listItem);
        });

    } catch (error) {
        console.error("Error loading songs:", error);
        playlistElement.innerHTML = "<li>Error loading songs. Try again.</li>";
    }
}

// Fetch Spotify Songs
async function fetchSpotifySongs() {
    const url = `https://api.spotify.com/v1/playlists/your_spotify_playlist_id/tracks`;

    const response = await fetch(url, {
        headers: {
            "Authorization": `Bearer ${CONFIG.SPOTIFY_API_KEY}`
        }
    });

    if (!response.ok) throw new Error("Failed to fetch Spotify songs");

    const data = await response.json();
    return data.items.map(track => ({
        title: track.track.name,
        url: track.track.preview_url || "#"
    }));
}

// Fetch YouTube Songs
async function fetchYouTubeSongs() {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=your_youtube_playlist_id&key=${CONFIG.YOUTUBE_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) throw new Error("Failed to fetch YouTube songs");

    const data = await response.json();
    return data.items.map(video => ({
        title: video.snippet.title,
        url: `https://www.youtube.com/watch?v=${video.snippet.resourceId.videoId}`
    }));
}

// Play the selected song
function playSong(url) {
    const audioPlayer = document.getElementById("audio-player");

    if (url === "#") {
        alert("No preview available for this song.");
        return;
    }

    audioPlayer.src = url;
    audioPlayer.play();
}
