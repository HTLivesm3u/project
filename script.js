    // ====== State ======
    const audio = document.getElementById('audio');
    let songQueue = [];          // [{id,title,artist,cover,url?:string|null}]
    let currentSongIndex = 0;
    let shuffleMode = false;
    let repeatMode = false;
    let isPlaying = false;

    // ====== Utils ======
    const $ = (id) => document.getElementById(id);
    const fmt = (sec)=> {
      if (!isFinite(sec)) return '00:00';
      const m = Math.floor(sec/60);
      const s = Math.floor(sec%60);
      return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    };
    const pickLargest = (arr, key='link') =>
      Array.isArray(arr) && arr.length ? (arr[arr.length-1][key] || arr[arr.length-1]) : '';

    // Try to extract the best playable URL from a Saavn song object
    function extractPlayableUrl(song) {
      // Prefer highest quality from downloadUrl
      const dl = Array.isArray(song?.downloadUrl) ? song.downloadUrl : song?.download_url;
      let url = Array.isArray(dl) && dl.length ? dl[dl.length-1]?.link || dl[dl.length-1]?.url : null;
      // Fallbacks seen in some wrappers
      if (!url && song?.media_url) url = song.media_url;
      if (!url && song?.url) url = song.url;
      return url || null;
    }

    // ====== UI update ======
    function updateUI(meta){
      // footer
      $('footer-cover').src = meta.cover || 'https://via.placeholder.com/60x60?text=🎵';
      $('footer-title').textContent = meta.title || 'No Song';
      $('footer-artist').textContent = meta.artist || '---';
      // banner
      $('banner-cover-image').src = meta.cover || 'https://via.placeholder.com/80x80?text=🎵';
      $('banner-song-title').textContent = meta.title || 'Title';
      $('banner-artist-name').textContent = meta.artist || 'Artist';
      // buttons
      $('playPauseIcon').className = isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
      $('banner-play-pause').innerHTML = `<i class="fa-solid ${isPlaying?'fa-pause':'fa-play'}"></i>`;
    }

    function updateProgress(){
      $('current-time').textContent = fmt(audio.currentTime || 0);
      $('duration').textContent = fmt(audio.duration || 0);
      const pct = (audio.currentTime && audio.duration) ? (audio.currentTime / audio.duration) * 100 : 0;
      $('progress').style.width = `${pct}%`;
    }

    // ====== Media Session for background controls ======
    function setMediaSession(meta){
      if (!('mediaSession' in navigator)) return;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: meta.title,
        artist: meta.artist,
        artwork: meta.cover ? [{src: meta.cover, sizes:'512x512', type:'image/png'}] : []
      });
      navigator.mediaSession.setActionHandler('play',  () => togglePlay(true));
      navigator.mediaSession.setActionHandler('pause', () => togglePlay(false));
      navigator.mediaSession.setActionHandler('previoustrack', prevSong);
      navigator.mediaSession.setActionHandler('nexttrack', nextSong);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in audio) audio.fastSeek(details.seekTime);
        else audio.currentTime = details.seekTime;
      });
    }

    // ====== Search (JioSaavn) ======
    async function searchSongs(){
      const q = $('search-query').value.trim();
      if (!q) return alert('Enter song!');
      $('song-list').innerHTML = 'Searching...';

      try{
        const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(q)}`);
        const data = await res.json();
        const results = data?.data?.results || [];
        if (!results.length){
          $('song-list').innerHTML = '<div style="opacity:.8">No results</div>';
          return;
        }

        // Build queue (URLs loaded lazily on play)
        songQueue = results.map(s => ({
          id: s.id,
          title: s.name,
          artist: s.primaryArtists,
          cover: pickLargest(s?.image, 'link'),
          url: null
        }));

        renderResults(songQueue);
      } catch(err){
        console.error(err);
        $('song-list').innerHTML = '<div style="opacity:.8">Error fetching results</div>';
      }
    }

    function renderResults(items){
      const container = $('song-list');
      container.innerHTML = '';
      items.forEach((s, i) => {
        const div = document.createElement('div');
        div.className = 'song-item';
        div.innerHTML = `
          <img src="${s.cover || 'https://via.placeholder.com/72x72?text=🎵'}" alt="cover">
          <div class="meta">
            <div class="title">${s.title}</div>
            <div class="artist">${s.artist || ''}</div>
          </div>
        `;
        div.onclick = () => playIndex(i);
        container.appendChild(div);
      });
    }

    // ====== Playback ======
    async function ensureUrlLoaded(index){
      const s = songQueue[index];
      if (s.url) return s.url;
      try{
        const res = await fetch(`https://saavn.dev/api/songs?ids=${encodeURIComponent(s.id)}`);
        const data = await res.json();
        const full = data?.data?.[0];
        const url = extractPlayableUrl(full);
        if (url){
          s.url = url;
          // update cover/title/artist if better fields exist
          s.cover = s.cover || pickLargest(full?.image, 'link');
          s.title = s.title || full?.name || '';
          s.artist = s.artist || full?.primaryArtists || '';
        }
        return s.url || null;
      }catch(err){
        console.error('Failed to load song url', err);
        return null;
      }
    }

    async function playIndex(index){
      if (index < 0 || index >= songQueue.length) return;
      currentSongIndex = index;
      const s = songQueue[index];

      const url = await ensureUrlLoaded(index);
      if (!url){
        alert('No playable URL found for this song.');
        return;
      }

      audio.src = url;
      audio.play().catch(()=>{ /* autoplay block */ });
      isPlaying = true;
      updateUI(s);
      setMediaSession(s);
    }

    function togglePlay(shouldPlay){
      if (typeof shouldPlay === 'boolean'){
        if (shouldPlay) audio.play(); else audio.pause();
      }else{
        if (audio.paused) audio.play(); else audio.pause();
      }
    }

    function nextSong(){
      if (!songQueue.length) return;
      if (shuffleMode){
        let n = Math.floor(Math.random()*songQueue.length);
        if (songQueue.length > 1 && n === currentSongIndex){
          n = (n+1) % songQueue.length;
        }
        playIndex(n);
      }else{
        const n = (currentSongIndex + 1) % songQueue.length;
        playIndex(n);
      }
    }
    function prevSong(){
      if (!songQueue.length) return;
      const n = (currentSongIndex - 1 + songQueue.length) % songQueue.length;
      playIndex(n);
    }

    // ====== Events / Wiring ======
    $('search-btn').addEventListener('click', searchSongs);
    $('search-query').addEventListener('keydown', (e)=>{ if(e.key==='Enter') searchSongs(); });

    // Footer buttons
    $('prev').addEventListener('click', prevSong);
    $('next').addEventListener('click', nextSong);
    $('playPause').addEventListener('click', ()=> togglePlay());

    // Banner buttons mirror footer
    $('banner-prev').addEventListener('click', prevSong);
    $('banner-next').addEventListener('click', nextSong);
    $('banner-play-pause').addEventListener('click', ()=> togglePlay());

    // Expand/Collapse banner
    $('footerToggleBtn').addEventListener('click', ()=>{
      const b = $('musicbanner');
      b.style.display = (b.style.display === 'block') ? 'none' : 'block';
    });
    $('close-banner-btn').addEventListener('click', ()=> $('musicbanner').style.display='none');

    // Audio events
    audio.addEventListener('play', ()=>{
      isPlaying = true;
      $('playPauseIcon').className = 'fa-solid fa-pause';
      $('banner-play-pause').innerHTML = '<i class="fa-solid fa-pause"></i>';
    });
    audio.addEventListener('pause', ()=>{
      isPlaying = false;
      $('playPauseIcon').className = 'fa-solid fa-play';
      $('banner-play-pause').innerHTML = '<i class="fa-solid fa-play"></i>';
    });
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('ended', ()=>{
      if (repeatMode){
        audio.currentTime = 0; audio.play();
      } else {
        nextSong();
      }
    });

    // Seek via progress bar
    $('progress-bar').addEventListener('click', (e)=>{
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      if (isFinite(audio.duration)) audio.currentTime = audio.duration * pct;
    });

    // Shuffle / Repeat toggles
    $('shuffle-btn').addEventListener('click', ()=>{
      shuffleMode = !shuffleMode;
      alert('Shuffle is ' + (shuffleMode ? 'ON' : 'OFF'));
    });
    $('repeat-btn').addEventListener('click', ()=>{
      repeatMode = !repeatMode;
      alert('Repeat is ' + (repeatMode ? 'ON' : 'OFF'));
    });

    // Optional: preload a demo search
    // searchSongs();
