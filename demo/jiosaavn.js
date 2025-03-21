import CONFIG from "./config.js";
import { playSong } from "./app.js";

async function loadJioSaavnSongs() {
    const apiUrl = `${CONFIG.JIOSAAVN_API_URL}/search?query=latest`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        const songsList = document.getElementById("songs-list");
        songsList.innerHTML = "";

        data.results.forEach(song => {
            const songTitle = song.title;
            const songUrl = song.downloadUrl[4].link;

            const listItem = document.createElement("li");
            listItem.textContent = songTitle;
            listItem.addEventListener("click", () => playSong(songUrl, songTitle));
            songsList.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error fetching JioSaavn songs:", error);
    }
}

export { loadJioSaavnSongs };
