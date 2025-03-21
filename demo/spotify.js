import CONFIG from "./config.js";
import { playSong } from "./app.js";

async function loadSpotifySongs() {
    const token = await getSpotifyToken();
    const playlistId = "your_spotify_playlist_id"; 
    const apiUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

    const options = {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    const response = await fetch(apiUrl, options);
    const data = await response.json();

    const songsList = document.getElementById("songs-list");
    songsList.innerHTML = "";

    data.items.forEach(item => {
        const track = item.track;
        const songTitle = track.name;
        const previewUrl = track.preview_url;

        if (previewUrl) {
            const listItem = document.createElement("li");
            listItem.textContent = songTitle;
            listItem.addEventListener("click", () => playSong(previewUrl, songTitle));
            songsList.appendChild(listItem);
        }
    });
}

async function getSpotifyToken() {
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(CONFIG.SPOTIFY_CLIENT_ID + ":" + CONFIG.SPOTIFY_CLIENT_SECRET)}`
        },
        body: "grant_type=client_credentials"
    });

    const data = await response.json();
    return data.access_token;
}

export { loadSpotifySongs };
