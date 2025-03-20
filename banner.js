// script.js (Main Music45 App Logic)
import CONFIG from "./config.js";

const spotifyTokenUrl = "https://accounts.spotify.com/api/token";
const youtubeApiUrl = "https://www.googleapis.com/youtube/v3/search";

async function getSpotifyToken() {
    const response = await fetch(spotifyTokenUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + btoa(CONFIG.SPOTIFY_CLIENT_ID + ":" + CONFIG.SPOTIFY_CLIENT_SECRET)
        },
        body: "grant_type=client_credentials"
    });
    const data = await response.json();
    return data.access_token;
}

async function fetchSpotifySongs(playlistId) {
    const token = await getSpotifyToken();
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: { "Authorization": "Bearer " + token }
    });
    const data = await response.json();
    return data.items.map(item => ({
        title: item.track.name,
        artist: item.track.artists[0].name,
        album: item.track.album.name,
        preview_url: item.track.preview_url
    }));
}

async function fetchYouTubeSongs(query) {
    const response = await fetch(`${youtubeApiUrl}?part=snippet&q=${query}&key=${CONFIG.YOUTUBE_API_KEY}&type=video`);
    const data = await response.json();
    return data.items.map(item => ({
        title: item.snippet.title,
        videoId: item.id.videoId
    }));
}

async function loadSongs(source, playlistId) {
    let songs = [];
    if (source === "spotify") {
        songs = await fetchSpotifySongs(playlistId);
    } else if (source === "youtube") {
        songs = await fetchYouTubeSongs("Top trending songs");
    }
    displaySongs(songs);
}

function displaySongs(songs) {
    const playlistContainer = document.getElementById("playlist");
    playlistContainer.innerHTML = "";
    songs.forEach(song => {
        const songElement = document.createElement("div");
        songElement.classList.add("song-item");
        songElement.innerHTML = `<p>${song.title} - ${song.artist || "YouTube"}</p>`;
        songElement.onclick = () => playSong(song);
        playlistContainer.appendChild(songElement);
    });
}

function playSong(song) {
    const audioPlayer = document.getElementById("audio-player");
    if (song.preview_url) {
        audioPlayer.src = song.preview_url;
        audioPlayer.play();
    } else if (song.videoId) {
        window.open(`https://www.youtube.com/watch?v=${song.videoId}`, "_blank");
    }
}

document.getElementById("load-spotify").addEventListener("click", () => loadSongs("spotify", "your_spotify_playlist_id"));
document.getElementById("load-youtube").addEventListener("click", () => loadSongs("youtube"));
