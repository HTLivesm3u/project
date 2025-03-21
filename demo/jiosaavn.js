async function searchJioSaavnSongs(query) {
    const apiUrl = `https://saavn.dev/api/search?query=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        console.log("API Response:", data); // Debugging: Log API response

        if (!data.success || !data.data) {
            console.error("No results found:", data.message || "Unknown error");
            return [];
        }

        return data.data.results || []; // Ensure we return an array
    } catch (error) {
        console.error("Error fetching JioSaavn search results:", error);
        return [];
    }
}

// Function to display search results
async function searchAndDisplaySongs(query) {
    const results = await searchJioSaavnSongs(query);
    const searchResultsContainer = document.getElementById("search-results");

    searchResultsContainer.innerHTML = ""; // Clear previous results

    if (!Array.isArray(results) || results.length === 0) {
        searchResultsContainer.innerHTML = "<p>No songs found.</p>";
        return;
    }

    results.forEach(song => {
        console.log("Processing song:", song.name); // Debugging

        const songTitle = song.name;
        const songUrl = song.downloadUrl ? song.downloadUrl[4]?.link : null;

        if (songUrl) {
            const listItem = document.createElement("li");
            listItem.textContent = songTitle;
            listItem.style.cursor = "pointer";
            listItem.style.padding = "5px";
            listItem.style.borderBottom = "1px solid #ccc";

            listItem.addEventListener("click", () => playSong(songUrl, songTitle));
            searchResultsContainer.appendChild(listItem);
        } else {
            console.warn(`No valid URL for song: ${songTitle}`);
        }
    });

    console.log("Songs displayed on screen!"); // Debugging
}

// Function to play a song
function playSong(url, title) {
    const audioPlayer = document.getElementById("audio-player");
    audioPlayer.src = url;
    audioPlayer.play();
    console.log("Now playing:", title);
}

// Event Listener for search button
document.getElementById("search-button").addEventListener("click", () => {
    const query = document.getElementById("search-input").value.trim();
    if (query) {
        searchAndDisplaySongs(query);
    } else {
        console.warn("Search query is empty!");
    }
});
