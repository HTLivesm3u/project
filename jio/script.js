// ===== Music45 — full fixed JS =====

// Helper to get element by id
const $ = id => document.getElementById(id);

// DOM elements
const searchInput = $('search-query');
const searchBtn = $('search-btn');
const resultsContainer = $('song-list');

const audio = $('audio');

const footerCover = $('footer-cover');
const footerTitle = $('footer-title');
const footerArtist = $('footer-artist');
const playPauseBtn = $('playPause');
const playPauseIcon = $('playPauseIcon');
const prevBtn = $('prev');
const nextBtn = $('next');
const footerToggleBtn = $('footer-song-info');

const musicBanner = $('musicbanner');
const bannerCover = $('banner-cover-image');
const bannerTitle = $('banner-song-title');
const bannerArtist = $('banner-artist-name');
const bannerPlayPauseBtn = $('banner-play-pause');
const bannerPrev = $('banner-prev');
const bannerNext = $('banner-next');
const shuffleBtn = $('shuffle-btn');
const repeatBtn = $('repeat-btn');
const closeBannerBtn = $('close-banner-btn');

const progressBar = $('progress-bar');
const progressFill = $('progress');
const currentTimeEl = $('current-time');
const durationEl = $('duration');

// state
let queue = [];
let currentIndex = -1;
let currentSong = null;   // 🔥 keep track of the last played song
let shuffleMode = false;
let repeatMode = false;
let isPlaying = false;


// ---------- Utilities ----------
function safeLog(...args){ console.log('[Music45]', ...args); }

function getStringField(obj, ...names){
  for (const n of names) if (obj && typeof obj[n] !== 'undefined' && obj[n] !== null) return obj[n];
  return '';
}

function getCoverImageFromSong(song){
  if (!song) return 'https://music45.vercel.app/music/music45.webp';
  if (Array.isArray(song.image) && song.image.length){
    const first = song.image[0];
    if (typeof first === 'object'){
      const best = song.image.find(i => i.quality && /500|b|large|high/i.test(i.quality)) || song.image[song.image.length-1];
      return best.link || best.url || best[Object.keys(best)[0]] || String(best);
    } else {
      return song.image[song.image.length - 1];
    }
  }
  if (song.image_url) return song.image_url;
  if (song.cover) return song.cover;
  return 'https://music45.vercel.app/music/music45.webp';
}

function extractPlayableUrlFromDetails(details){
  if (!details) return null;
  if (details.media_url) return details.media_url;
  const dl = details.downloadUrl || details.download_url;
  if (Array.isArray(dl) && dl.length){
    const last = dl[dl.length - 1];
    return last.link || last.url || null;
  }
  if (details.url) return details.url;
  if (details.audio) return details.audio;
  return null;
}

function getTitle(song){
  return getStringField(song, 'name', 'song', 'title') || 'Unknown Title';
}
function getArtist(song){
  let a = getStringField(song, 'primaryArtists', 'primary_artists', 'singers', 'artist');
  if (a) return a;
  if (song.artists && Array.isArray(song.artists.primary) && song.artists.primary.length) {
    return song.artists.primary.map(x => x.name).join(', ');
  }
  if (song.artists && Array.isArray(song.artists.featured) && song.artists.featured.length) {
    return song.artists.featured.map(x => x.name).join(', ');
  }
  return 'Unknown Artist';
}

function escapeHtml(s){
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderResults(list){
  resultsContainer.innerHTML = '';
  if (!list || !list.length){
    resultsContainer.innerHTML = '<div style="opacity:.7;padding:18px;text-align:center">No results</div>';
    return;
  }
  for (let i=0;i<list.length;i++){
    const item = list[i];
    const div = document.createElement('div');
    div.className = 'song-item';
    div.innerHTML = `
      <img src="${item.cover}" alt="cover" />
      <div class="meta">
        <div class="title">${escapeHtml(item.title)}</div>
        <div class="artist">${escapeHtml(item.artist)}</div>
      </div>
    `;
    div.addEventListener('click', ()=> playIndex(i));
    resultsContainer.appendChild(div);
  }
}


// ---------- Search ----------
async function searchSongs(){
  const q = (searchInput?.value || '').trim();
  if (!q) return alert('Enter song!');
  resultsContainer.innerHTML = 'Searching...';

  try {
    const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(q)}`);
    const data = await res.json();
    const results = data?.data?.results || [];

    queue = results.map(r => ({
      id: r.id,
      title: getTitle(r),
      artist: getArtist(r),
      cover: getCoverImageFromSong(r),
      url: null,
      raw: r
    }));

    // keep current song if already playing
    if (!currentSong) currentIndex = -1;

    renderResults(queue);
  } catch (err){
    console.error('search error', err);
    resultsContainer.innerHTML = '<div style="opacity:.7;padding:18px;text-align:center">Search failed</div>';
  }
}


// ---------- Loading + Playing ----------
async function ensureItemUrl(index){
  const item = queue[index];
  if (!item) return null;
  if (item.url) return item.url;
  try {
    const res = await fetch(`https://saavn.dev/api/songs?ids=${encodeURIComponent(item.id)}`);
    const d = await res.json();
    const full = d?.data?.[0] || d?.data || null;
    if (!full){
      safeLog('no details for', item.id, d);
      return null;
    }
    const url = extractPlayableUrlFromDetails(full);
    if (url) item.url = url;
    item.title = getTitle(full) || item.title;
    item.artist = getArtist(full) || item.artist;
    item.cover = getCoverImageFromSong(full) || item.cover;
    return item.url || null;
  } catch (err){
    console.error('detail fetch', err);
    return null;
  }
}

async function playIndex(index){
  if (index < 0 || index >= queue.length) return;
  currentIndex = index;
  currentSong = queue[index]; // 🔥 remember current song

  updateNowPlayingUI(currentSong, false);
  const url = await ensureItemUrl(index);
  if (!url){
    alert('No playable URL found for this song.');
    nextSong();
    return;
  }

  audio.src = url;
  try { await audio.play(); }
  catch(e){ safeLog('play blocked', e); }
  isPlaying = true;
  updateNowPlayingUI(currentSong, true);
  setMediaSessionForItem(currentSong);
}

function updateNowPlayingUI(item, playing){
  if (!item) item = currentSong; // fallback

  const cover = item?.cover || 'https://music45.vercel.app/music/music45.webp';
  const title = item?.title || 'Unknown Song';
  const artist = item?.artist || 'Unknown Artist';

  footerCover.src = cover;
  footerTitle.textContent = title;
  footerArtist.textContent = artist;

  bannerCover.src = cover;
  bannerTitle.textContent = title;
  bannerArtist.textContent = artist;

  const pc = document.querySelector('.player-container');
  if (pc) pc.style.setProperty('--banner-cover-url', `url("${cover}")`);

  isPlaying = !!playing;
  playPauseIcon.className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  if (bannerPlayPauseBtn) {
    bannerPlayPauseBtn.innerHTML = `<i class="fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}"></i>`;
  }
}


// ---------- Controls ----------
async function togglePlay(){
  if (!audio.src && queue.length) {
    await playIndex(0);
    return;
  }
  if (audio.paused) {
    await audio.play().catch(()=>{});
    isPlaying = true;
  } else {
    audio.pause();
    isPlaying = false;
  }
  updateNowPlayingUI(currentSong, isPlaying);
}

function nextSong(){
  if (!queue.length) return;
  if (shuffleMode){
    let n = Math.floor(Math.random() * queue.length);
    if (queue.length > 1 && n === currentIndex) n = (n + 1) % queue.length;
    playIndex(n);
  } else {
    playIndex((currentIndex + 1) % queue.length);
  }
}
function prevSong(){
  if (!queue.length) return;
  if (shuffleMode){
    let n = Math.floor(Math.random() * queue.length);
    if (queue.length > 1 && n === currentIndex) n = (n + 1) % queue.length;
    playIndex(n);
  } else {
    playIndex((currentIndex - 1 + queue.length) % queue.length);
  }
}


// ---------- Progress ----------
audio.addEventListener('timeupdate', ()=>{
  const cur = audio.currentTime || 0;
  const dur = audio.duration || 0;
  currentTimeEl.textContent = formatTime(cur);
  durationEl.textContent = formatTime(dur);
  const pct = (dur > 0) ? (cur / dur) * 100 : 0;
  progressFill.style.width = pct + '%';
});
audio.addEventListener('loadedmetadata', ()=>{
  durationEl.textContent = formatTime(audio.duration || 0);
});
audio.addEventListener('play', ()=> { isPlaying = true; updateNowPlayingUI(currentSong, true); });
audio.addEventListener('pause', ()=> { isPlaying = false; updateNowPlayingUI(currentSong, false); });
audio.addEventListener('ended', ()=>{
  if (repeatMode) {
    audio.currentTime = 0;
    audio.play();
  } else nextSong();
});

progressBar.addEventListener('click', (e)=>{
  const rect = e.currentTarget.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  if (isFinite(audio.duration) && !isNaN(pct)) audio.currentTime = pct * audio.duration;
});


// ---------- Media Session ----------
function setMediaSessionForItem(item){
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.title,
      artist: item.artist,
      artwork: [{ src: item.cover, sizes:'512x512', type:'image/jpeg' }]
    });
    navigator.mediaSession.setActionHandler('play', ()=> audio.play());
    navigator.mediaSession.setActionHandler('pause', ()=> audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', prevSong);
    navigator.mediaSession.setActionHandler('nexttrack', nextSong);
  } catch(e){}
}


// ---------- UI wiring ----------
if (searchBtn) searchBtn.addEventListener('click', searchSongs);
if (searchInput) searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchSongs(); });

if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlay);
if (bannerPlayPauseBtn) bannerPlayPauseBtn.addEventListener('click', togglePlay);

if (nextBtn) nextBtn.addEventListener('click', nextSong);
if (prevBtn) prevBtn.addEventListener('click', prevSong);
if (bannerNext) bannerNext.addEventListener('click', nextSong);
if (bannerPrev) bannerPrev.addEventListener('click', prevSong);

if (shuffleBtn) shuffleBtn.addEventListener('click', ()=>{
  shuffleMode = !shuffleMode;
  shuffleBtn.style.opacity = shuffleMode ? '1' : '0.7';
  alert('Shuffle ' + (shuffleMode ? 'ON' : 'OFF'));
});
if (repeatBtn) repeatBtn.addEventListener('click', ()=>{
  repeatMode = !repeatMode;
  repeatBtn.style.opacity = repeatMode ? '1' : '0.7';
  alert('Repeat ' + (repeatMode ? 'ON' : 'OFF'));
});

footerToggleBtn.addEventListener("click", () => {
  if (musicBanner.style.display === "block") {
    musicBanner.style.display = "none";
    history.pushState(null, null, window.location.href);
  } else {
    musicBanner.style.display = "block";
    history.pushState({ musicBannerOpen: true }, null, window.location.href);
  }
});

window.addEventListener("popstate", () => {
  if (musicBanner.style.display === "block") {
    musicBanner.style.display = "none";
  }
});

closeBannerBtn.addEventListener("click", () => {
  musicBanner.style.display = "none";
});


// ---------- Helpers ----------
function formatTime(t){
  if (!isFinite(t) || isNaN(t)) return '00:00';
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}


// ---------- Expose for debug ----------
window.Music45 = { queue, playIndex, nextSong, prevSong, searchSongs };

updateNowPlayingUI({title:'No Song', artist:'', cover:'https://music45.vercel.app/music/music45.webp'}, false);
