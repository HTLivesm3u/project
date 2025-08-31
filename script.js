// =============================
// 🎵 Music45 Full JS
// With JioSaavn API + Cover Fix + Queue Controls
// =============================

const searchInput = document.getElementById("search-input");
const resultsDiv = document.getElementById("results");
const audioPlayer = document.getElementById("audio-player");
const musicBanner = document.getElementById("music-banner");
const songImg = document.getElementById("song-img");
const songTitle = document.getElementById("song-title");
const songArtist = document.getElementById("song-artist");
const footerPlayer = document.getElementById("player");
const footerImg = document.getElementById("footer-img");
const footerTitle = document.getElementById("footer-title");
const footerArtist = document.getElementById("footer-artist");
const footerPlay = document.getElementById("footer-play");
const playBtn = document.getElementById("play-btn");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");

let currentQueue = [];
let currentIndex = 0;
let isShuffle = false;
let isRepeat = false;

// ✅ Get Cover Image (robust fix)
function getCoverImage(song) {
  if (Array.isArray(song.image) && song.image.length) {
    if (typeof song.image[0] === "object") {
      const best = song.image.find(img => img.quality === "500x500") || song.image[song.image.length - 1];
      return best.url;
    } else {
      return song.image[song.image.length - 1];
    }
  }
  if (song.image_url) return song.image_url;
  return "https://via.placeholder.com/500x500?text=No+Cover";
}

// ✅ Extract Playable URL
function extractPlayableUrl(song) {
  if (song.media_url) return song.media_url;
  if (song.downloadUrl && song.downloadUrl.length) {
    return song.downloadUrl[song.downloadUrl.length - 1].link;
  }
  return null;
}

// ✅ Play Song
async function playSong(song) {
  const coverImage = getCoverImage(song);
  const audioUrl = extractPlayableUrl(song);

  if (!audioUrl) {
    alert("No playable URL found for this song.");
    return;
  }

  // Update Banner
  songImg.src = coverImage;
  songTitle.innerText = song.song || "Unknown Song";
  songArtist.innerText = song.primary_artists || "Unknown Artist";

  // Update Footer
  footerImg.src = coverImage;
  footerTitle.innerText = song.song || "Unknown Song";
  footerArtist.innerText = song.primary_artists || "Unknown Artist";

  // Update Player
  audioPlayer.src = audioUrl;
  footerPlayer.style.display = "flex";
  musicBanner.style.display = "block";
  audioPlayer.play();

  playBtn.innerHTML = `<i class="fas fa-pause"></i>`;
  footerPlay.innerHTML = `<i class="fas fa-pause"></i>`;

  // Lock Screen Controls (MediaSession API)
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.song || "Unknown Song",
      artist: song.primary_artists || "Unknown Artist",
      artwork: [{ src: coverImage, sizes: "500x500", type: "image/png" }]
    });

    navigator.mediaSession.setActionHandler("play", () => audioPlayer.play());
    navigator.mediaSession.setActionHandler("pause", () => audioPlayer.pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => prevSong());
    navigator.mediaSession.setActionHandler("nexttrack", () => nextSong());
  }
}

// ✅ Search Songs
async function searchSongs(query) {
  resultsDiv.innerHTML = "Loading...";
  try {
    const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    const songs = data.data.results;

    currentQueue = songs;
    currentIndex = 0;

    resultsDiv.innerHTML = songs.map((song, i) => `
      <div class="song" onclick='playFromQueue(${i})'>
        <img src="${getCoverImage(song)}" alt="cover">
        <p>${song.song} - ${song.primary_artists}</p>
      </div>
    `).join("");
  } catch (err) {
    console.error(err);
    resultsDiv.innerHTML = "Error fetching songs.";
  }
}

// ✅ Play from Queue
function playFromQueue(index) {
  currentIndex = index;
  playSong(currentQueue[currentIndex]);
}

// ✅ Next Song
function nextSong() {
  if (!currentQueue.length) return;

  if (isShuffle) {
    currentIndex = Math.floor(Math.random() * currentQueue.length);
  } else {
    currentIndex = (currentIndex + 1) % currentQueue.length;
  }

  playSong(currentQueue[currentIndex]);
}

// ✅ Previous Song
function prevSong() {
  if (!currentQueue.length) return;

  if (isShuffle) {
    currentIndex = Math.floor(Math.random() * currentQueue.length);
  } else {
    currentIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
  }

  playSong(currentQueue[currentIndex]);
}

// ✅ Controls
playBtn.addEventListener("click", () => {
  if (audioPlayer.paused) {
    audioPlayer.play();
    playBtn.innerHTML = `<i class="fas fa-pause"></i>`;
    footerPlay.innerHTML = `<i class="fas fa-pause"></i>`;
  } else {
    audioPlayer.pause();
    playBtn.innerHTML = `<i class="fas fa-play"></i>`;
    footerPlay.innerHTML = `<i class="fas fa-play"></i>`;
  }
});

footerPlay.addEventListener("click", () => {
  playBtn.click();
});

nextBtn.addEventListener("click", nextSong);
prevBtn.addEventListener("click", prevSong);

// ✅ Auto Next on Song End
audioPlayer.addEventListener("ended", () => {
  if (isRepeat) {
    playSong(currentQueue[currentIndex]);
  } else {
    nextSong();
  }
});

// ✅ Search Trigger
searchInput.addEventListener("keyup", e => {
  if (e.key === "Enter" && searchInput.value.trim()) {
    searchSongs(searchInput.value.trim());
  }
});
