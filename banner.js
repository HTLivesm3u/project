let currentSongIndex = 0;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let currentSongs = [];

updatePlaylistName("Spotify Playlist");

// UI Elements
const suggestionsList = document.getElementById("suggestions-list");
const searchBar = document.getElementById("search-bar");
const playPauseBtn = document.getElementById("footer-play-pause");
const audio = new Audio();

// Load song into player
function loadSong(song) {
  audio.src = song.src;
  updateMediaSession(song);
  
  if (isPlaying) audio.play();
  updateSongList();
}

// Toggle Play/Pause
function togglePlayPause() {
  if (isPlaying) {
    audio.pause();
  } else {
    audio.play();
  }
  isPlaying = !isPlaying;
  updatePlayPauseButtons();
}

function updatePlayPauseButtons() {
  playPauseBtn.textContent = isPlaying ? "⏸️" : "▶️";
}

// Play next song
function playNextSong() {
  currentSongIndex = (currentSongIndex + 1) % currentSongs.length;
  loadSong(currentSongs[currentSongIndex]);
}

// Play previous song
function playPrevSong() {
  currentSongIndex = (currentSongIndex - 1 + currentSongs.length) % currentSongs.length;
  loadSong(currentSongs[currentSongIndex]);
}

// Search functionality
searchBar.addEventListener("input", async () => {
  const query = searchBar.value.trim();
  if (query) {
    const matches = await searchSpotify(query);
    displaySuggestions(matches);
  }
});

// Fetch songs from Spotify API
async function searchSpotify(query) {
  const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track`, {
    headers: { Authorization: `Bearer YOUR_SPOTIFY_ACCESS_TOKEN` }
  });
  const data = await response.json();
  return data.tracks.items.map(track => ({
    title: track.name,
    artist: track.artists[0].name,
    src: track.preview_url || "",
    cover: track.album.images[0].url
  }));
}

// Fetch songs from YouTube API
async function searchYouTube(query) {
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&key=YOUR_YOUTUBE_API_KEY`);
  const data = await response.json();
  return data.items.map(video => ({
    title: video.snippet.title,
    artist: video.snippet.channelTitle,
    src: `https://www.youtube.com/watch?v=${video.id.videoId}`,
    cover: video.snippet.thumbnails.default.url
  }));
}

// Display search suggestions
function displaySuggestions(songs) {
  suggestionsList.innerHTML = "";
  songs.forEach(song => {
    const li = document.createElement("li");
    li.textContent = `${song.title} - ${song.artist}`;
    li.addEventListener("click", () => {
      currentSongs = songs;
      currentSongIndex = songs.indexOf(song);
      loadSong(song);
    });
    suggestionsList.appendChild(li);
  });
}

// Update media session
function updateMediaSession(song) {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      artwork: [{ src: song.cover, sizes: "128x128", type: "image/png" }]
    });
  }
}

// Event Listeners
playPauseBtn.addEventListener("click", togglePlayPause);
document.getElementById("next").addEventListener("click", playNextSong);
document.getElementById("prev").addEventListener("click", playPrevSong);

audio.addEventListener("ended", () => {
  if (isRepeat) audio.play();
  else playNextSong();
});

// Initialize default songs from Spotify
document.addEventListener("DOMContentLoaded", async () => {
  currentSongs = await searchSpotify("Top Hindi Songs");
  loadSong(currentSongs[0]);
});
