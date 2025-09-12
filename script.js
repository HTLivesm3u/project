// ===== Music45 (JioSaavn integration) wired to your new UI =====

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

    // State
    let queue = [];
    let currentIndex = -1;
    let isPlaying = false;
    let recentlyPlayed = [];

  // --- Add this helper at the top ---
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
    const extractPlayableUrl = details => {
      if (!details) return null;
      if (details.media_url) return details.media_url;
      const dl = details.downloadUrl || details.download_url;
      if (Array.isArray(dl) && dl.length){
        const last = dl[dl.length - 1];
        return last.link || last.url || null;
      }
      return details.url || details.audio || null;
    };
    const formatTime = t => {
      if (!isFinite(t) || isNaN(t)) return '00:00';
      const m = Math.floor(t/60), s = Math.floor(t%60);
      return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    };

    function updateUI(item, playing){
      const cover = item?.cover || FALLBACK_COVER;
      imgEl.src = cover;
      titleEl.textContent = item?.title || 'Unknown Song';
      artistEl.textContent = item?.artist || 'Unknown Artist';
      // icon
      playIcon.setAttribute('data-lucide', playing ? 'pause' : 'play');
      refreshIcons();
    }

    function addToRecently(item){
      if (!item) return;
      // keep unique by id+title
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

    // Search and queue via saavn.dev
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

    async function togglePlay(){
      if (!audio.src){
        // no song yet: play something default
        await searchAndQueue('lofi beats', true);
        return;
      }
      if (audio.paused){
        try{ await audio.play(); isPlaying = true; }catch(e){ /* ignore */ }
      }else{
        audio.pause(); isPlaying = false;
      }
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
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);

    // Make all cards playable by search
    function makePlayableByQuery(container){
      container.querySelectorAll('[data-q]').forEach(el=>{
        el.addEventListener('click', ()=> {
          const q = el.getAttribute('data-q');
          searchAndQueue(q, true);
        });
      });
    }
    makePlayableByQuery(quickGrid);
    makePlayableByQuery(newReleasesWrap);

    // Bottom nav (visual)
    document.querySelectorAll('.nav-item').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        // (Optional) show/hide sections by tab if you add tabbed views later
      });
    });

    // First icon paint
    refreshIcons();

    // --- Search handling ---
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const searchResultsWrap = document.getElementById("search-results");

// Perform search
async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  try {
    const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    const results = data?.data?.results || [];

    // Render results
    searchResultsWrap.innerHTML = "";
    if (!results.length) {
      searchResultsWrap.innerHTML = `<p style="color:var(--foreground-muted)">No results found.</p>`;
      return;
    }

    results.forEach(r => {
      const item = {
        id: r.id,
        title: getTitle(r),
        artist: getArtist(r),
        cover: getCover(r),
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
        queue = [item];
        currentIndex = 0;
        playIndex(0);
      });
      searchResultsWrap.appendChild(div);
    });
  } catch (e) {
    console.error("Search failed", e);
    searchResultsWrap.innerHTML = `<p style="color:red">Error fetching results</p>`;
  }
}

// Bind search actions
searchBtn.addEventListener("click", handleSearch);
searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") handleSearch();
});


    // Optional: preload a nice default
    // searchAndQueue('Trending Bollywood', false);