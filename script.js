// ===== Music45 (JioSaavn integration + localStorage for Recently Played) =====

alert("The Developer Stop The making This app Because Of Studies Issues")

// Initialize Lucide icons
function refreshIcons(){ try { lucide.createIcons(); } catch(e) {} }
refreshIcons();

// Greeting
(function setGreeting(){
  const hour = new Date().getHours();
  document.getElementById('greeting').textContent =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
})();

// DOM refs
const audio = document.getElementById('audio');
const imgEl = document.getElementById('current-track-image');
const titleEl = document.getElementById('current-track-title');
const artistEl = document.getElementById('current-track-artist');
const playBtn = document.getElementById('btn-play');
const playIcon = document.getElementById('play-icon');
const prevBtn = document.getElementById('btn-prev');
const nextBtn = document.getElementById('btn-next');
const progressTrack = document.getElementById('progress-track');
const progressFill = document.getElementById('progress-fill');
const quickGrid = document.getElementById('quick-grid');
const recentlyWrap = document.getElementById('recently');
const newReleasesWrap = document.getElementById('new-releases');
const albumsWrap = document.getElementById('albums');

// State
let queue = [];
let currentIndex = -1;
let isPlaying = false;
let recentlyPlayed = [];
let shuffleMode = false; 

// --- Add this helper ---
function decodeHtmlEntities(str) {
  if (!str) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

// Helpers
const FALLBACK_COVER = 'https://music45beta.vercel.app/music/music45.webp';
const escapeHtml = s => String(s||'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const getTitle = s => decodeHtmlEntities(s?.name || s?.song || s?.title || "Unknown Title");
const getArtist = s => {
  let a =
    s?.primaryArtists || s?.primary_artists ||
    (s?.artists?.primary?.length ? s.artists.primary.map(a => a.name).join(", ") : null) ||
    (s?.artists?.featured?.length ? s.artists.featured.map(a => a.name).join(", ") : null) ||
    s?.singers || s?.artist || "Unknown Artist";
  return decodeHtmlEntities(a);
};
const getCover = s => {
  if (!s) return FALLBACK_COVER;
  if (Array.isArray(s.image) && s.image.length){
    const best = s.image.find(i => i.quality && /500|b|large|high/i.test(i.quality)) || s.image[s.image.length-1];
    return best.link || best.url || FALLBACK_COVER;
  }
  return s.image_url || s.cover || FALLBACK_COVER;
};

// --- UPDATED extractPlayableUrl ---
function extractPlayableUrl(details) {
  if (!details) return null;
  const dl = details.downloadUrl || details.download_url;
  if (Array.isArray(dl) && dl.length) {
    if (qualitySetting === "auto") {
      return dl[dl.length - 1].link || dl[dl.length - 1].url || null;
    }
    if (qualitySetting === "low") {
      const low = dl.find(x => /96/i.test(x.quality));
      if (low) return low.link || low.url;
    }
    if (qualitySetting === "medium") {
      const med = dl.find(x => /160/i.test(x.quality));
      if (med) return med.link || med.url;
    }
    if (qualitySetting === "high") {
      const high = dl.find(x => /320/i.test(x.quality));
      if (high) return high.link || high.url;
    }
    return dl[dl.length - 1].link || dl[dl.length - 1].url || null; // fallback
  }
  return details.media_url || details.url || details.audio || null;
}


// --- SETTINGS WITH BACK / POPSTATE --- //
let qualitySetting = localStorage.getItem("qualitySetting") || "auto";

const settingsSheet = document.getElementById("settings-sheet");
const closeSettings = document.getElementById("close-settings");

// Update active state of buttons
function refreshQualityButtons() {
  document.querySelectorAll(".quality-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.quality === qualitySetting);
  });
}

// Save selected quality
document.querySelectorAll(".quality-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    qualitySetting = btn.dataset.quality;
    localStorage.setItem("qualitySetting", qualitySetting);
    refreshQualityButtons();
  });
});

// Show settings (when gear icon is clicked)
document.querySelector('.header-icons button:last-child').addEventListener("click", () => {
  settingsSheet.classList.add("active");   // 🔹 use .active instead of style.display
  refreshQualityButtons();
  history.pushState({ settingsView: true }, "Settings", "#settings");
});

// Close settings (when ❌ back button is clicked)
closeSettings.addEventListener("click", () => {
  settingsSheet.classList.remove("active");
  if (window.history.state && window.history.state.settingsView) {
    history.back(); // clean history entry
  }
});

// Handle Android hardware back button
window.addEventListener("popstate", () => {
  if (window.history.state && window.history.state.settingsView) {
    settingsSheet.classList.add("active");
  } else {
    settingsSheet.classList.remove("active");
  }
});


// --- LOCALSTORAGE SAVE / LOAD ---
function saveRecentlyToStorage() {
  localStorage.setItem("recentSongs", JSON.stringify(recentlyPlayed));
}
function loadRecentlyFromStorage() {
  const data = JSON.parse(localStorage.getItem("recentSongs")) || [];
  recentlyPlayed = data;
  renderRecently();
}

// UI update
function updateUI(item, playing){
  const cover = item?.cover || FALLBACK_COVER;
  imgEl.src = cover;
  titleEl.textContent = item?.title || 'Unknown Song';
  artistEl.textContent = item?.artist || 'Unknown Artist';
  playBtn.innerHTML = playing
    ? '<i data-lucide="pause"></i>'
    : '<i data-lucide="play"></i>';
  refreshIcons();
}

// Recently played
function addToRecently(item){
  if (!item) return;
  const key = item.id ? 'id:'+item.id : 't:'+item.title;
  recentlyPlayed = recentlyPlayed.filter(x => x._k !== key);
  recentlyPlayed.unshift({...item, _k:key});
  recentlyPlayed = recentlyPlayed.slice(0,12);
  saveRecentlyToStorage();
  renderRecently();
}
function renderRecently(){
  recentlyWrap.innerHTML = '';
  recentlyPlayed.forEach(item=>{
    const card = document.createElement('div');
    card.className = 'music-card';
    card.innerHTML = `
      <img src="${escapeHtml(item.cover||FALLBACK_COVER)}" alt="${escapeHtml(item.title)}">
      <span>${escapeHtml(item.title)}</span>
    `;
    card.addEventListener('click', ()=> {
      queue = [item];
      currentIndex = 0;
      playIndex(0);
    });
    recentlyWrap.appendChild(card);
  });
}

// Search + queue
async function searchAndQueue(query, autoplay=true){
  if (!query) return;
  try{
    const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    const results = data?.data?.results || [];
    queue = results.map(r => ({
      id: r.id,
      title: getTitle(r),
      artist: getArtist(r),
      cover: getCover(r),
      url: null,
      raw: r
    }));
    currentIndex = queue.length ? 0 : -1;
    if (autoplay && currentIndex >= 0) await playIndex(currentIndex);
  }catch(e){
    console.error('Search failed', e);
    alert('Search failed. Try another query.');
  }
}

async function ensureUrlFor(index){
  const item = queue[index];
  if (!item) return null;
  if (item.url) return item.url;
  try{
    const res = await fetch(`https://saavn.dev/api/songs?ids=${encodeURIComponent(item.id)}`);
    const d = await res.json();
    const full = d?.data?.[0] || d?.data || null;
    if (!full) return null;
    item.url = extractPlayableUrl(full);
    item.title = getTitle(full) || item.title;
    item.artist = getArtist(full) || item.artist;
    item.cover = getCover(full) || item.cover;
    return item.url || null;
  }catch(e){
    console.error('Details failed', e);
    return null;
  }
}

async function playIndex(index){
  if (index < 0 || index >= queue.length) return;
  const item = queue[index];
  updateUI(item, false);
  const url = await ensureUrlFor(index);
  if (!url){
    alert('No playable URL found for this track.');
    return;
  }
  audio.src = url;
  try { await audio.play(); isPlaying = true; } catch(e){ isPlaying = false; }
  currentIndex = index;
  updateUI(item, isPlaying);
  addToRecently(item);
  setMediaSession(item);
}

// --- FIXED NEXT/PREV ---
async function nextSong() {
  if (!queue.length) return;
  let n;
  if (shuffleMode) {
    n = Math.floor(Math.random() * queue.length);
    if (queue.length > 1 && n === currentIndex) n = (n + 1) % queue.length;
  } else {
    n = (currentIndex + 1) % queue.length;
  }
  await playIndex(n);
}

async function prevSong() {
  if (!queue.length) return;
  let n;
  if (shuffleMode) {
    n = Math.floor(Math.random() * queue.length);
    if (queue.length > 1 && n === currentIndex) n = (n + 1) % queue.length;
  } else {
    n = (currentIndex - 1 + queue.length) % queue.length;
  }
  await playIndex(n);
}

async function togglePlay(){
  if (!audio.src){ await searchAndQueue('90s hindi', true); return; }
  if (audio.paused){ try{ await audio.play(); isPlaying = true; }catch{} }
  else{ audio.pause(); isPlaying = false; }
  updateUI(queue[currentIndex], isPlaying);
}

// Progress
audio.addEventListener('timeupdate', ()=>{
  const cur = audio.currentTime || 0;
  const dur = audio.duration || 0;
  const pct = dur > 0 ? (cur/dur)*100 : 0;
  progressFill.style.width = pct + '%';
});
progressTrack.addEventListener('click', (e)=>{
  const rect = progressTrack.getBoundingClientRect();
  const pct = (e.clientX - rect.left)/rect.width;
  if (isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(1, pct)) * audio.duration;
});
audio.addEventListener('play', ()=>{ isPlaying = true; updateUI(queue[currentIndex], true); });
audio.addEventListener('pause', ()=>{ isPlaying = false; updateUI(queue[currentIndex], false); });
audio.addEventListener('ended', ()=> nextSong());

// Media Session
function setMediaSession(item){
  if (!('mediaSession' in navigator) || !item) return;
  try{
    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.title,
      artist: item.artist,
      artwork: [{ src: item.cover || FALLBACK_COVER, sizes:'512x512', type:'image/png' }]
    });
    navigator.mediaSession.setActionHandler('play', ()=> audio.play());
    navigator.mediaSession.setActionHandler('pause', ()=> audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', prevSong);
    navigator.mediaSession.setActionHandler('nexttrack', nextSong);
    navigator.mediaSession.setActionHandler('seekto', e => { if (e.seekTime!=null) audio.currentTime = e.seekTime; });
  }catch(e){}
}

// Wire buttons
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', () => prevSong());
nextBtn.addEventListener('click', () => nextSong());

// --- New functions for albums ---
async function loadAlbums() {
  try {
    const albumQueries = ["Arijit Singh", "Pritam", "Shreya Ghoshal", "kishor kumar", "A.R. Rahman"];
    const allAlbums = [];
    for (const query of albumQueries) {
      const res = await fetch(`https://saavn.dev/api/search/albums?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data?.data?.results) {
        allAlbums.push(...data.data.results.slice(0, 5));
      }
    }
    renderAlbums(allAlbums);
  } catch (e) {
    console.error('Failed to load albums', e);
  }
}

async function renderAlbums(albums) {
  albumsWrap.innerHTML = '';
  albums.forEach(album => {
    const card = document.createElement('div');
    card.className = 'music-card';
    card.innerHTML = `
      <img src="${getCover(album)}" alt="${getTitle(album)}">
      <span>${getTitle(album)}</span>
    `;
    card.addEventListener('click', () => {
      playAlbum(album.id);
    });
    albumsWrap.appendChild(card);
  });
}

async function playAlbum(albumId) {
  try {
    const res = await fetch(`https://saavn.dev/api/albums?id=${encodeURIComponent(albumId)}`);
    const data = await res.json();
    const album = data?.data?.[0] || data?.data;
    const songs = album?.songs || [];

    if (!songs.length) {
      alert("No songs found in this album.");
      return;
    }

    document.getElementById("album-cover").src = getCover(album);
    document.getElementById("album-title").textContent = getTitle(album);
    document.getElementById("album-artist").textContent = getArtist(album);

    const tracksWrap = document.getElementById("album-tracks");
    tracksWrap.innerHTML = "";
    songs.forEach((s, i) => {
      const div = document.createElement("div");
      div.className = "album-track";
      div.innerHTML = `<span>${getTitle(s)}</span><small>${getArtist(s)}</small>`;
      div.addEventListener("click", () => {
        queue = songs.map(x => ({
          id: x.id,
          title: getTitle(x),
          artist: getArtist(x),
          cover: getCover(x),
          url: null,
          raw: x
        }));
        currentIndex = i;
        playIndex(i);
      });
      tracksWrap.appendChild(div);
    });

    document.getElementById("album-play").onclick = () => {
      queue = songs.map(x => ({
        id: x.id,
        title: getTitle(x),
        artist: getArtist(x),
        cover: getCover(x),
        url: null,
        raw: x
      }));
      currentIndex = 0;
      playIndex(0);
    };

    document.getElementById("album-view").style.display = "block";

  } catch (e) {
    console.error("Failed to fetch album songs", e);
    alert("Failed to load album songs.");
  }
}

// Back Button
document.getElementById("album-back").addEventListener("click", () => {
  document.getElementById("album-view").style.display = "none";
  // Remove album view state from history if present
  if (window.history.state && window.history.state.albumView) {
    history.back();
  }
});

// Push state when album view is opened
function showAlbumView() {
  document.getElementById("album-view").style.display = "block";
  const albumTitle = document.getElementById("album-title").textContent || "album";
  const hash = "#" + encodeURIComponent(albumTitle.replace(/\s+/g, ""));
  history.pushState({ albumView: true }, albumTitle, hash);
}

// Patch playAlbum to use showAlbumView
// (Replace: document.getElementById("album-view").style.display = "block";)
const origPlayAlbum = playAlbum;
playAlbum = async function(albumId) {
  await origPlayAlbum.call(this, albumId);
  showAlbumView();
};

// Listen for popstate to close album view
window.addEventListener("popstate", (e) => {
  if (!window.history.state || !window.history.state.albumView) {
    document.getElementById("album-view").style.display = "none";
  }
});



// Bottom nav (visual only)
document.querySelectorAll('.nav-item').forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    e.currentTarget.classList.add('active');
  });
});

// First icon paint
refreshIcons();

// --- Search handling ---
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const searchResultsWrap = document.getElementById("search-results");

async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  try {
    const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    const results = data?.data?.results || [];
    searchResultsWrap.innerHTML = "";
    if (!results.length) {
      searchResultsWrap.innerHTML = `<p style="color:var(--foreground-muted)">No results found.</p>`;
      return;
    }
    // 🔥 Fixed loop: queue all results
    results.forEach((r, i) => {
      const item = {
        id: r.id,
        title: getTitle(r),
        artist: getArtist(r),
        cover: getCover(r),
        url: null,
        raw: r
      };
      const div = document.createElement("div");
      div.className = "search-result-item";
      div.innerHTML = `
        <img src="${item.cover}" alt="${item.title}">
        <div class="search-result-info">
          <h4>${item.title}</h4>
          <p>${item.artist}</p>
        </div>
      `;
      div.addEventListener("click", () => {
        // Queue ALL results
        queue = results.map(r2 => ({
          id: r2.id,
          title: getTitle(r2),
          artist: getArtist(r2),
          cover: getCover(r2),
          url: null,
          raw: r2
        }));
        currentIndex = i;
        playIndex(currentIndex);
      });
      searchResultsWrap.appendChild(div);
    });
  } catch (e) {
    console.error("Search failed", e);
    searchResultsWrap.innerHTML = `<p style="color:red">Error fetching results</p>`;
  }
}
searchBtn.addEventListener("click", handleSearch);
searchInput.addEventListener("keydown", e => { if (e.key === "Enter") handleSearch(); });

// --- Load saved recently played when app starts ---
loadRecentlyFromStorage();
loadAlbums();
refreshQualityButtons();