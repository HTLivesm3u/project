// ✅ Fetch songs from JioSaavn API
async function searchJioSaavnSongs(query) {
    const apiUrl = `https://saavn.dev/api/search?query=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        console.log("✅ API Response:", data); // Debugging API response

        if (!data.success || !data.data || !Array.isArray(data.data.results)) {
            console.error("❌ No valid results found:", data.message || "Unknown error");
            return [];
        }

        return data.data.results; // Returns an array of songs
    } catch (error) {
        console.error("❌ Error fetching JioSaavn search results:", error);
        return [];
    }
}

// ✅ Display search results
async function searchAndDisplaySongs() {
    const query = document.getElementById("search-input").value.trim();
    const searchResultsContainer = document.getElementById("search-results");

    searchResultsContainer.innerHTML = "<p>🔍 Searching...</p>"; // Show loading message

    if (!query) {
        searchResultsContainer.innerHTML = "<p>❌ Enter a song name.</p>";
        return;
    }

    const results = await searchJioSaavnSongs(query);
    searchResultsContainer.innerHTML = ""; // Clear loading text

    console.log("🔎 Search Results:", results); // Debugging

    if (!results || results.length === 0) {
        searchResultsContainer.innerHTML = "<p>⚠️ No songs found.</p>";
        return;
    }

    // ✅ Loop through results & display
    results.forEach(song => {
        console.log("🎵 Processing song:", song.name, song); // Debugging each song

        const songTitle = song.name;
        const songUrl = song.downloadUrl?.[4]?.link || song.downloadUrl?.[0]?.link; // Ensure at least one URL exists

        if (songUrl) {
            const listItem = document.createElement("li");
            listItem.textContent = songTitle;
            listItem.style.cursor = "pointer";
            listItem.style.padding = "10px";
            listItem.style.borderBottom = "1px solid #ddd";
            listItem.style.listStyle = "none"; // Ensure it looks good

            listItem.addEventListener("click", () => playSong(songUrl, songTitle));
            searchResultsContainer.appendChild(listItem);
        } else {
            console.warn(`⚠️ No valid URL for song: ${songTitle}`, song);
        }
    });

    console.log("✅ Songs displayed on screen!");
}

// ✅ Play a song
function playSong(songUrl, songTitle) {
    console.log(`▶️ Playing: ${songTitle} - ${songUrl}`);

    const audioPlayer = document.getElementById("audio-player");
    const nowPlaying = document.getElementById("now-playing");

    if (!audioPlayer || !nowPlaying) {
        console.error("❌ Audio elements not found!");
        return;
    }

    audioPlayer.src = songUrl;
    audioPlayer.play();
    nowPlaying.textContent = `🎶 Now Playing: ${songTitle}`;
}

// ✅ Event Listener for search button
document.getElementById("search-btn").addEventListener("click", searchAndDisplaySongs);
