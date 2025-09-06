

        
        
        // Initialize Lucide icons
        lucide.createIcons();

          // =============================
  // Globals
  // =============================
  let queue = [];
  let currentSong = null;
  let currentIndex = -1;
  const audio = new Audio();

  const searchInput = document.getElementById('search-query');
  const resultsContainer = document.getElementById('search-results');

  // Player UI refs
  const footerCover = document.getElementById('current-track-image');
  const footerTitle = document.getElementById('current-track-title');
  const footerArtist = document.getElementById('current-track-artist');

  // =============================
  // Helpers
  // =============================
  function getTitle(song) {
    return song?.title || song?.name || "Unknown Title";
  }

  function getArtist(song) {
    return song?.primaryArtists || song?.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist";
  }

  function getCoverImageFromSong(song) {
    return song?.image?.[2]?.link || song?.image?.[0]?.link || "https://music45beta.vercel.app/music/music45.webp";
  }

  function extractPlayableUrlFromDetails(full) {
    return full?.downloadUrl?.[2]?.link || full?.downloadUrl?.[0]?.link || null;
  }

  // =============================
  // Search
  // =============================
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

      if (!currentSong) currentIndex = -1;
      renderResults(queue);
    } catch (err){
      console.error('search error', err);
      resultsContainer.innerHTML = '<div style="opacity:.7;padding:18px;text-align:center">Search failed</div>';
    }
  }

  // =============================
  // Render results
  // =============================
  function renderResults(list) {
    resultsContainer.innerHTML = "";
    if (!list.length) {
      resultsContainer.innerHTML = "<p style='color:var(--foreground-muted);padding:1rem'>No songs found</p>";
      return;
    }
    list.forEach((song, i) => {
      const div = document.createElement("div");
      div.className = "search-result-item";
      div.onclick = () => playIndex(i);
      div.innerHTML = `
        <img src="${song.cover}" alt="${song.title}">
        <div class="search-result-info">
          <h4>${song.title}</h4>
          <p>${song.artist}</p>
        </div>
      `;
      resultsContainer.appendChild(div);
    });
  }

  // =============================
  // Playing logic
  // =============================
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

  const cover = item?.cover || 'https://music45beta.vercel.app/music/music45.webp';
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
  // =============================
  // Greeting init
  // =============================
  function setGreeting() {
    const hour = new Date().getHours();
    let greeting;
    if (hour < 12) greeting = "Good morning";
    else if (hour < 18) greeting = "Good afternoon";
    else greeting = "Good evening";
    document.getElementById('greeting').textContent = greeting;
  }
  setGreeting();


        // Set greeting based on time
        function setGreeting() {
            const hour = new Date().getHours();
            let greeting;
            if (hour < 12) greeting = "Good morning";
            else if (hour < 18) greeting = "Good afternoon";
            else greeting = "Good evening";
            document.getElementById('greeting').textContent = greeting;
        }

        // Play/pause functionality
        let isPlaying = false;
        function togglePlay() {
            isPlaying = !isPlaying;
            const playIcon = document.getElementById('play-icon');
            playIcon.setAttribute('data-lucide', isPlaying ? 'pause' : 'play');
            lucide.createIcons();
        }

        // Tab switching
        // Tab switching
function setActiveTab(tab) {
    // Hide all tab sections
    document.querySelectorAll('.tab-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected tab
    document.getElementById(`${tab}-tab`).style.display = 'block';

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
}


        // Play track
        function playTrack(title) {
            console.log(`Playing ${title}`);
            document.getElementById('current-track-title').textContent = title;
            isPlaying = true;
            const playIcon = document.getElementById('play-icon');
            playIcon.setAttribute('data-lucide', 'pause');
            lucide.createIcons();
        }

        // Initialize
        setGreeting();

        function getTitle(song) {
  return song?.title || song?.name || "Unknown Title";
}

function getArtist(song) {
  return song?.primaryArtists || song?.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist";
}

function getCoverImageFromSong(song) {
  return song?.image?.[2]?.link || song?.image?.[0]?.link || "https://music45beta.vercel.app/music/music45.webp";
}

function extractPlayableUrlFromDetails(full) {
  // Pick highest quality audio URL
  return full?.downloadUrl?.[2]?.link || full?.downloadUrl?.[0]?.link || null;
}


function renderResults(list) {
  resultsContainer.innerHTML = "";

  if (!list.length) {
    resultsContainer.innerHTML = "<p style='color:var(--foreground-muted);padding:1rem'>No songs found</p>";
    return;
  }

  list.forEach((song, i) => {
    const div = document.createElement("div");
    div.className = "search-result-item";
    div.onclick = () => playIndex(i);

    div.innerHTML = `
      <img src="${song.cover}" alt="${song.title}">
      <div class="search-result-info">
        <h4>${song.title}</h4>
        <p>${song.artist}</p>
      </div>
    `;
    resultsContainer.appendChild(div);
  });
}
