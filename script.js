// ===== Music45 (JioSaavn integration) - FULL fixed script.js =====

// ---------- Utilities & setup ----------
function refreshIcons(){ try { lucide.createIcons(); } catch(e){ /* ignore */ } }
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
const prevBtn = document.getElementById('btn-prev');
const nextBtn = document.getElementById('btn-next');
const progressTrack = document.getElementById('progress-track');
const progressFill = document.getElementById('progress-fill');
const quickGrid = document.getElementById('quick-grid');
const recentlyWrap = document.getElementById('recently');
const newReleasesWrap = document.getElementById('new-releases');
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const searchResultsWrap = document.getElementById("search-results");

// State
let queue = [];
let currentIndex = -1;
let isPlaying = false;
let recentlyPlayed = [];

// playRequest token: increment for each new play request to cancel stale responses
let playRequestToken = 0;

// Helpers
const FALLBACK_COVER = 'https://music45beta.vercel.app/music/music45.webp';
function decodeHtmlEntities(str) {
  if (!str) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}
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
const extractPlayableUrl = details => {
  if (!details) return null;
  // common fields used by various Saavn wrappers
  if (details.media_url) return details.media_url;
  if (details.media && Array.isArray(details.media) && details.media.length) {
    const m = details.media[0];
    if (m?.url) return m.url;
    if (m?.media_url) return m.media_url;
  }
  if (details.downloadUrl) {
    if (Array.isArray(details.downloadUrl) && details.downloadUrl.length) {
      const last = details.downloadUrl[details.downloadUrl.length-1];
      return last.link || last.url || null;
    }
    if (typeof details.downloadUrl === 'string') return details.downloadUrl;
  }
  if (details.download_url) {
    if (Array.isArray(details.download_url) && details.download_url.length) {
      const last = details.download_url[details.download_url.length-1];
      return last.link || last.url || null;
    }
    if (typeof details.download_url === 'string') return details.download_url;
  }
  if (details.url) return details.url;
  if (details.audio) return details.audio;
  // fallback: look for any http(s) in JSON (last resort, fragile)
  try {
    const j = JSON.stringify(details);
    const m = j.match(/https?:\/\/[^"']+?(\.mp3|\.m4a|\.aac|\.ogg|bitrate)[^"']*/i);
    if (m) return m[0];
  } catch(e){}
  return null;
};
const formatTime = t => {
  if (!isFinite(t) || isNaN(t)) return '00:00';
  const m = Math.floor(t/60), s = Math.floor(t%60);
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
};

// Play button icon + disabled state
function setPlayBtn( { playing=false, loading=false } = {} ){
  // set inner icon (lucide will replace it on refresh)
  playBtn.innerHTML = `<i data-lucide="${playing ? 'pause' : 'play'}"></i>`;
  playBtn.disabled = !!loading;
  refreshIcons();
  // small accessibility tooltip
  playBtn.title = loading ? 'Loading...' : (playing ? 'Pause' : 'Play');
}

// Update main player UI - if loading true, show 'Loading...' text to avoid flash
function updateUI(item, playing=false, loading=false){
  const cover = item?.cover || FALLBACK_COVER;
  // If loading, show a placeholder image quickly (so UI doesn't flash previous image)
  imgEl.src = loading ? FALLBACK_COVER : cover;
  titleEl.textContent = loading ? 'Loading...' : (item?.title || 'Unknown Song');
  artistEl.textContent = loading ? '' : (item?.artist || 'Unknown Artist');
  setPlayBtn({ playing: !!playing, loading: !!loading });
}

// Recently played helpers
function addToRecently(item){
  if (!item) return;
  const key = item.id ? 'id:'+item.id : 't:'+item.title;
  recentlyPlayed = recentlyPlayed.filter(x => x._k !== key);
  recentlyPlayed.unshift({...item, _k:key});
  recentlyPlayed = recentlyPlayed.slice(0,12);
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

// ---------- Network helpers with simple de-duplication ----------
async function fetchJson(url){
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ensureUrlFor: memoizes in-flight fetch on item._loadingPromise to avoid duplicate requests
async function ensureUrlFor(index){
  const item = queue[index];
  if (!item) return null;
  if (item.url) return item.url;
  if (item._loadingPromise) return item._loadingPromise;

  // create promise and attach
  item._loadingPromise = (async () => {
    try {
      // Many Saavn wrappers accept ids param like: ?ids=<id>
      const url = `https://saavn.dev/api/songs?ids=${encodeURIComponent(item.id)}`;
      const json = await fetchJson(url);
      // attempt to find the full object (varies per wrapper)
      let full = null;
      if (Array.isArray(json?.data) && json.data.length) full = json.data[0];
      else if (Array.isArray(json)) full = json[0];
      else if (json?.data) full = json.data;

      if (!full) {
        // sometimes endpoint returns object keyed by id
        // try to find first object in response
        for (const k in json) {
          if (json[k] && typeof json[k] === 'object') { full = json[k]; break; }
        }
      }
      if (!full) return null;

      const candidateUrl = extractPlayableUrl(full);
      // Normalize title/artist/cover if available
      item.title = getTitle(full) || item.title;
      item.artist = getArtist(full) || item.artist;
      item.cover = getCover(full) || item.cover;
      item.rawFull = full;
      item.url = candidateUrl || null;
      return item.url || null;
    } catch(e){
      console.error('ensureUrlFor error', e);
      return null;
    } finally {
      // clear the loading promise after resolution so retries are possible
      delete item._loadingPromise;
    }
  })();

  return item._loadingPromise;
}

// ---------- Core playback logic with anti-race guarding ----------
async function playIndex(index){
  if (index < 0 || index >= queue.length) return;
  // increment token for this play request
  const myToken = ++playRequestToken;
  const item = queue[index];

  // show loading UI for this requested item (do not show previous item's info)
  updateUI(item, false, true);

  // fetch playable URL
  const url = await ensureUrlFor(index);

  // If a newer play request started while we were fetching, abort updating UI here
  if (myToken !== playRequestToken) {
    // console.debug('playIndex aborted by newer request', index);
    return;
  }

  if (!url) {
    // no playable URL - inform user and revert UI to item details (non-loading)
    updateUI(item, false, false);
    alert('No playable URL found for this track.');
    return;
  }

  // set src and attempt to play
  // set audio.src before play() to ensure mediaSession and other events are based on this src
  audio.src = url;

  try {
    await audio.play();
    isPlaying = true;
  } catch(e) {
    // could be autoplay blocked; leave isPlaying false
    console.warn('play() failed', e);
    isPlaying = false;
  }

  // commit index only after successful set (keeps currentIndex consistent)
  currentIndex = index;

  updateUI(queue[currentIndex], isPlaying, false);
  addToRecently(queue[currentIndex]);
  setMediaSession(queue[currentIndex]);
}

// Next / Prev
function nextSong(){
  if (!queue.length) return;
  const n = (currentIndex + 1) % queue.length;
  playIndex(n);
}
function prevSong(){
  if (!queue.length) return;
  const p = (currentIndex - 1 + queue.length) % queue.length;
  playIndex(p);
}

// Toggle play/pause
async function togglePlay(){
  // if nothing loaded and queue available -> play current or first
  if (!audio.src) {
    if (queue.length && currentIndex >= 0) {
      await playIndex(currentIndex);
      return;
    }
    if (queue.length) {
      currentIndex = 0;
      await playIndex(0);
      return;
    }
    // fallback: load a default queue and autoplay
    await searchAndQueue('lofi beats', true);
    return;
  }

  if (audio.paused) {
    try { await audio.play(); isPlaying = true; } catch(e){ console.warn(e); isPlaying = false; }
  } else {
    audio.pause(); isPlaying = false;
  }
  updateUI(queue[currentIndex] || null, isPlaying, false);
}

// ---------- Audio events & progress ----------
audio.addEventListener('timeupdate', ()=>{
  const cur = audio.currentTime || 0;
  const dur = audio.duration || 0;
  const pct = dur > 0 ? (cur/dur)*100 : 0;
  progressFill.style.width = pct + '%';
});
progressTrack.addEventListener('click', (e)=>{
  const rect = progressTrack.getBoundingClientRect();
  const pct = (e.clientX - rect.left)/rect.width;
  if (isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Math.max(0, Math.min(1, pct)) * audio.duration;
});
audio.addEventListener('play', ()=>{ isPlaying = true; updateUI(queue[currentIndex] || null, true, false); });
audio.addEventListener('pause', ()=>{ isPlaying = false; updateUI(queue[currentIndex] || null, false, false); });
audio.addEventListener('ended', ()=> nextSong());
audio.addEventListener('loadedmetadata', ()=> {
  // ensure progress immediately in sync
  const pct = audio.duration ? ((audio.currentTime||0)/audio.duration)*100 : 0;
  progressFill.style.width = pct + '%';
});

// Media Session metadata & handlers
function setMediaSession(item){
  if (!('mediaSession' in navigator) || !item) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.title || 'Unknown',
      artist: item.artist || '',
      artwork: [{ src: item.cover || FALLBACK_COVER, sizes:'512x512', type:'image/png' }]
    });
    navigator.mediaSession.setActionHandler('play', ()=> audio.play());
    navigator.mediaSession.setActionHandler('pause', ()=> audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', prevSong);
    navigator.mediaSession.setActionHandler('nexttrack', nextSong);
    navigator.mediaSession.setActionHandler('seekto', e => { if (e.seekTime!=null) audio.currentTime = e.seekTime; });
  } catch(e) {
    // ignore non-critical errors
  }
}

// ---------- Search & queue population ----------
// Search wrapper: builds a full queue from results
async function searchAndQueue(query, autoplay=true){
  if (!query) return;
  try {
    const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    const results = data?.data?.results || [];
    if (!results.length) {
      searchResultsWrap.innerHTML = `<p style="color:var(--foreground-muted)">No results found.</p>`;
      return;
    }

    // Build full queue (url left null - will be fetched when playing)
    queue = results.map(r => ({
      id: r.id,
      title: getTitle(r),
      artist: getArtist(r),
      cover: getCover(r),
      url: null,
      raw: r
    }));

    // Optionally autoplay first item
    if (autoplay) {
      currentIndex = 0;
      await playIndex(0);
    }

    return queue;
  } catch(e) {
    console.error('searchAndQueue failed', e);
    throw e;
  }
}

// Full search handler that renders results list and allows clicking any index to play (queue preserved)
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

    // Build queue from results
    queue = results.map(r => ({
      id: r.id,
      title: getTitle(r),
      artist: getArtist(r),
      cover: getCover(r),
      url: null,
      raw: r
    }));

    // Render results to UI and attach click handlers referencing the index
    results.forEach((r, idx) => {
      const item = queue[idx];
      const div = document.createElement("div");
      div.className = "search-result-item";
      div.innerHTML = `
        <img src="${escapeHtml(item.cover||FALLBACK_COVER)}" alt="${escapeHtml(item.title)}">
        <div class="search-result-info">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.artist)}</p>
        </div>
      `;
      div.addEventListener("click", () => {
        // play at this index inside the full queue
        currentIndex = idx;
        playIndex(idx);
      });
      searchResultsWrap.appendChild(div);
    });
  } catch (e) {
    console.error("Search failed", e);
    searchResultsWrap.innerHTML = `<p style="color:red">Error fetching results</p>`;
  }
}

// Bind search input & button
searchBtn?.addEventListener("click", handleSearch);
searchInput?.addEventListener("keydown", e => { if (e.key === "Enter") handleSearch(); });

// ---------- UI quick cards (grid / new releases) ----------
function makePlayableByQuery(container){
  if (!container) return;
  container.querySelectorAll('[data-q]').forEach(el=>{
    el.addEventListener('click', ()=> {
      const q = el.getAttribute('data-q');
      // build a queue from this search and autoplay
      searchAndQueue(q, true).catch(e => {
        console.error('Quick card search failed', e);
        alert('Failed to load songs for this card.');
      });
    });
  });
}
makePlayableByQuery(quickGrid);
makePlayableByQuery(newReleasesWrap);

// ---------- Buttons wiring ----------
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', prevSong);
nextBtn.addEventListener('click', nextSong);

// Bottom nav visual (keeps existing behavior)
document.querySelectorAll('.nav-item').forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
    e.currentTarget.classList.add('active');
  });
});

// Initial icons
refreshIcons();

// Optional: preload a default (uncomment if you want a default queue loaded on start)
// searchAndQueue('trending bollywood', false).catch(()=>{});

