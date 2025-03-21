import CONFIG from "./config.js";
import { loadSpotifySongs } from "./spotify.js";
import { loadJioSaavnSongs } from "./jiosaavn.js";

document.getElementById("load-spotify").addEventListener("click", () => {
    loadSpotifySongs();
});

document.getElementById("load-jiosaavn").addEventListener("click", () => {
    loadJioSaavnSongs();
});

function playSong(url, title) {
    const player = document.getElementById("audio-player");
    player.src = url;
    player.play();

    document.getElementById("song-title").innerText = `Now Playing: ${title}`;
}

export { playSong };
