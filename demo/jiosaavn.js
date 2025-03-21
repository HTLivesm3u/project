// ✅ Fetch songs from JioSaavn API
async function searchJioSaavnSongs(query) {
    const apiUrl = `https://saavn.dev/api/search?query=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        console.log("✅ Full API Response:", data); // Print full API response

        if (!data.success || !data.data) {
            console.error("❌ API Error:", data.message || "Unknown error");
            return [];
        }

        console.log("🔍 Available keys:", Object.keys(data.data)); // Check existing keys

        // Try different keys to extract song list
        let results = data.data.results || data.data.songs || data.data.tracks || [];

        console.log("🔎 Extracted Results:", results);

        if (!Array.isArray(results) || results.length === 0) {
            console.warn("⚠️ No valid songs found.");
            return [];
        }

        return results;
    } catch (error) {
        console.error("❌ Fetch Error:", error);
        return [];
    }
}


// ✅ Function to search and display results
async function searchAndDisplaySongs() {
    const query = document.getElementById("search-input").value.trim();
    const searchResultsContainer = document.getElementById("search-results");

    searchResultsContainer.innerHTML = "<p>🔍 Searching...</p>"; // Show loading

    if (!query) {
        searchResultsContainer.innerHTML = "<p>❌ Enter a song name.</p>";
        return;
    }

    const results = await searchJioSaavnSongs(query);
    searchResultsContainer.innerHTML = ""; // Clear previous results

    console.log("🔎 Processed Search Results:", results);

    if (!results || results.length === 0) {
        searchResultsContainer.innerHTML = "<p>⚠️ No songs found.</p>";
        return;
    }

    // ✅ Display one song for debugging
    searchResultsContainer.innerHTML = `<li>${results[0]?.name || "Unknown Song"}</li>`;

    // ✅ Display full list of songs
    results.forEach(song => {
        console.log("🎵 Processing Song:", song);

        const songTitle = song.name || "Unknown";
        const songUrl = song.downloadUrl?.[4]?.link || song.downloadUrl?.[0]?.link;

        if (songUrl) {
            const listItem = document.createElement("li");
            listItem.textContent = songTitle;
            listItem.style.cursor = "pointer";
            listItem.addEventListener("click", () => playSong(songUrl, songTitle));

            searchResultsContainer.appendChild(listItem);
        } else {
            console.warn(`⚠️ No valid URL for song: ${songTitle}`);
        }
    });

    console.log("✅ Songs displayed successfully!");
}

// ✅ Function to play a song
function playSong(songUrl, songTitle) {
    console.log(`▶️ Playing: ${songTitle} - ${songUrl}`);

    const audioPlayer = document.getElementById("audio-player");
    const nowPlaying = document.getElementById("now-playing");

    if (!audioPlayer || !nowPlaying) {
        console.error("❌ Audio elements missing in HTML!");
        return;
    }

    audioPlayer.src = songUrl;
    audioPlayer.play();
    nowPlaying.textContent = `🎶 Now Playing: ${songTitle}`;
}

// ✅ Event Listener for Search Button
document.getElementById("search-btn").addEventListener("click", searchAndDisplaySongs);
