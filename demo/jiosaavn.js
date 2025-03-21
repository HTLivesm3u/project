async function searchJioSaavnSongs(query) {
    const apiUrl = `https://saavn.dev/api/search?query=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.success || !data.data || data.data.length === 0) {
            console.error("No results found:", data);
            return [];
        }

        return data.data; // Returns an array of song results
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

    if (results.length === 0) {
        searchResultsContainer.innerHTML = "<p>No songs found.</p>";
        return;
    }

    results.forEach(song => {
        const songTitle = song.name;
        const songUrl = song.downloadUrl ? song.downloadUrl[4].link : null;

        if (songUrl) {
            const listItem = document.createElement("li");
            listItem.textContent = songTitle;
            listItem.addEventListener("click", () => playSong(songUrl, songTitle));
            searchResultsContainer.appendChild(listItem);
        }
    });
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
    const query = document.getElementById("search-input").value;
    searchAndDisplaySongs(query);
});
