import { hindiSongs, englishSongs, marathiSongs, teluguSongs } from './songs.js';

let currentSongIndex = 0;
let isPlaying = false;

let audio = document.getElementById("audio");

// Footer controls
const playPauseBtn = document.getElementById("footer-play-pause");
const footerToggleBtn = document.getElementById("footer-toggle-btn");
const footerSongTitle = document.getElementById("footer-song-title");
const footerArtistName = document.getElementById("footer-artist-name");
const footerCoverImage = document.getElementById("footer-cover-image");
const nextBtn = document.getElementById("next");

// Music banner controls
const musicBanner = document.getElementById("music-banner");
const bannerPlayPauseBtn = document.getElementById("banner-play-pause");
const bannerSongTitle = document.getElementById("banner-song-title");
const bannerArtistName = document.getElementById("banner-artist-name");
const bannerCoverImage = document.getElementById("banner-cover-image");
const progressBar = document.getElementById("progress");
const currentTimeElem = document.getElementById("current-time");
const durationElem = document.getElementById("duration");
const downloadBtn = document.getElementById("download-btn");

// Load song function
function loadSong(song) {
  audio.src = song.src;
  footerSongTitle.textContent = song.title;
  footerArtistName.textContent = song.artist;
  footerCoverImage.src = song.cover;
  bannerSongTitle.textContent = song.title;
  bannerArtistName.textContent = song.artist;
  bannerCoverImage.src = song.cover;

  // Update duration in the banner
  audio.onloadedmetadata = () => {
    durationElem.textContent = formatTime(audio.duration);
  };

  // Update lock screen media session
  updateMediaSession(song);

  // If it's already playing, play the song
  if (isPlaying) {
    audio.play();
  }
}

// Format time (e.g., 3:45)
function formatTime(time) {
  let minutes = Math.floor(time / 60);
  let seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Play/Pause function
function togglePlayPause() {
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
    playPauseBtn.textContent = "▶️";
    bannerPlayPauseBtn.textContent = "▶️";
  } else {
    audio.play();
    isPlaying = true;
    playPauseBtn.textContent = "⏸️";
    bannerPlayPauseBtn.textContent = "⏸️";
  }
}

// Update progress bar
audio.ontimeupdate = () => {
  const progressPercent = (audio.currentTime / audio.duration) * 100;
  progressBar.style.width = `${progressPercent}%`;
  currentTimeElem.textContent = formatTime(audio.currentTime);
};

// Toggle Music Banner
footerToggleBtn.addEventListener("click", () => {
  musicBanner.style.display = musicBanner.style.display === "none" ? "block" : "none";
});

// Download functionality
downloadBtn.addEventListener("click", () => {
  const currentSong = currentSongs[currentSongIndex];
  const link = document.createElement("a");
  link.href = currentSong.src;
  link.download = `${currentSong.title} - ${currentSong.artist}.mp3`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Initialize song
let currentSongs = hindiSongs; // Default to Hindi songs
loadSong(currentSongs[currentSongIndex]);

// Play/Pause button in footer
playPauseBtn.addEventListener("click", togglePlayPause);

// Play/Pause button in banner
bannerPlayPauseBtn.addEventListener("click", togglePlayPause);

// Next button functionality
nextBtn.addEventListener("click", playNextSong);

// Play next song
function playNextSong() {
  currentSongIndex = (currentSongIndex + 1) % currentSongs.length;
  loadSong(currentSongs[currentSongIndex]);
  if (isPlaying) {
    audio.play();
  }
}

// Play previous song
function playPrevSong() {
  currentSongIndex = (currentSongIndex - 1 + currentSongs.length) % currentSongs.length;
  loadSong(currentSongs[currentSongIndex]);
  if (isPlaying) {
    audio.play();
  }
}

// Playlist switching buttons
document.getElementById("hindi-btn").addEventListener("click", () => {
  currentSongs = hindiSongs;
  currentSongIndex = 0;
  loadSong(currentSongs[currentSongIndex]);
});

document.getElementById("english-btn").addEventListener("click", () => {
  currentSongs = englishSongs;
  currentSongIndex = 0;
  loadSong(currentSongs[currentSongIndex]);
});

document.getElementById("marathi-btn").addEventListener("click", () => {
  currentSongs = marathiSongs;
  currentSongIndex = 0;
  loadSong(currentSongs[currentSongIndex]);
});

document.getElementById("telugu-btn").addEventListener("click", () => {
  currentSongs = teluguSongs;
  currentSongIndex = 0;
  loadSong(currentSongs[currentSongIndex]);
});

// Update lock screen media information and handle mobile controls
function updateMediaSession(song) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      artwork: [
        { src: song.cover, sizes: '96x96', type: 'image/png' },
        { src: song.cover, sizes: '128x128', type: 'image/png' },
        { src: song.cover, sizes: '192x192', type: 'image/png' },
        { src: song.cover, sizes: '256x256', type: 'image/png' },
        { src: song.cover, sizes: '384x384', type: 'image/png' },
        { src: song.cover, sizes: '512x512', type: 'image/png' },
      ],
    });

    // Handle mobile lock screen controls
    navigator.mediaSession.setActionHandler('play', () => {
      audio.play();
      isPlaying = true;
      playPauseBtn.textContent = '⏸️';
      bannerPlayPauseBtn.textContent = '⏸️';
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      audio.pause();
      isPlaying = false;
      playPauseBtn.textContent = '▶️';
      bannerPlayPauseBtn.textContent = '▶️';
    });

    navigator.mediaSession.setActionHandler('nexttrack', playNextSong);
    navigator.mediaSession.setActionHandler('previoustrack', playPrevSong);

    // Seek forward
    navigator.mediaSession.setActionHandler('seekforward', () => {
      audio.currentTime = Math.min(audio.currentTime + 10, audio.duration);
    });

    // Seek backward
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      audio.currentTime = Math.max(audio.currentTime - 10, 0);
    });
  }
}
