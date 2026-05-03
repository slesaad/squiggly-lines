<script>
  import { onMount } from 'svelte';

  let {
    cadenPhoto,
    cadenTriumphantPhoto,
    cadenCryingPhoto,
    steps = [],
  } = $props();

  let activeIndex = $state(0);
  let inView = $state(true);
  let rootEl;
  let storyEl;

  let autoplay = $state(false);
  let autoplayTimer = null;
  let autoplayCancelled = $state(false);

  function clearAutoplayTimer() {
    if (autoplayTimer) {
      clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function scheduleAutoplayAdvance() {
    clearAutoplayTimer();
    if (!autoplay) return;
    if (activeIndex >= steps.length - 1) {
      autoplay = false;
      return;
    }
    const step = steps[activeIndex];
    const advance = () => {
      const next = storyEl?.querySelectorAll('.step')[activeIndex + 1];
      if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    if (step.duration === 'video-end') {
      // Video onended will schedule advance; fallback timer 30s
      autoplayTimer = setTimeout(advance, 30000);
    } else {
      autoplayTimer = setTimeout(advance, step.duration ?? 5000);
    }
  }

  $effect(() => {
    if (autoplay && !autoplayCancelled) {
      scheduleAutoplayAdvance();
    } else {
      clearAutoplayTimer();
    }
  });

  function startAutoplay() {
    autoplayCancelled = false;
    autoplay = true;
  }
  function stopAutoplay() {
    autoplay = false;
    autoplayCancelled = true;
    clearAutoplayTimer();
  }
  let backHref = $state('/');

  const base = import.meta.env.BASE_URL || '';

  function resolveBack(path) {
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    const baseWithSlash = base.endsWith('/') ? base : base + '/';
    return baseWithSlash + normalized;
  }

  function handleBack(e) {
    const ref = document.referrer;
    if (ref && new URL(ref).origin === window.location.origin && window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
  }

  const PHOTO_KINDS = new Set([
    'intro-greeting', 'intro-skit-cap', 'intro-skit-degree',
    'late-nights', 'flying-colors',
  ]);
  const MAP_KINDS = new Set(['map-intro', 'video', 'map-home']);
  const ENDING_KINDS = new Set(['ending']);
  const activeKind = $derived(steps[activeIndex]?.kind ?? 'intro-greeting');
  const activePanel = $derived(
    PHOTO_KINDS.has(activeKind) ? 'photo'
    : MAP_KINDS.has(activeKind) ? 'map'
    : ENDING_KINDS.has(activeKind) ? 'ending'
    : 'photo'
  );

  const HOME = [-86.5861, 34.7304]; // Huntsville, AL

  // All city centers — kept consistent so every fly lands the same way.
  const COORDS = {
    australia:       [151.2093, -33.8688], // Sydney
    saudiarabia:     [46.6753, 24.7136],   // Riyadh
    nepal:           [85.3240, 27.7172],   // Kathmandu
    pennsylvinia:    [-75.1652, 39.9526],  // Philadelphia
    northcarolina:   [-78.6382, 35.7796],  // Raleigh
    atlanta:         [-84.3880, 33.7490],  // Atlanta
    nashville:       [-86.7816, 36.1627],  // Nashville
    texas:           [-97.7431, 30.2672],  // Austin
    phoenixalabama:  [-85.0008, 32.4709],  // Phenix City
    alabama:         [-86.8025, 33.5186],  // Birmingham
    huntsville:      HOME,
  };

  const LOCATION_LABELS = {
    australia:       'Sydney, Australia',
    saudiarabia:     'Riyadh, Saudi Arabia',
    nepal:           'Kathmandu, Nepal',
    pennsylvinia:    'Philadelphia, PA',
    northcarolina:   'Raleigh, NC',
    atlanta:         'Atlanta, GA',
    nashville:       'Nashville, TN',
    texas:           'Austin, TX',
    phoenixalabama:  'Phenix City, AL',
    alabama:         'Birmingham, AL',
    huntsville:      'Huntsville, AL',
  };

  // Single source of truth for video-step zoom — keeps every fly identical.
  const VIDEO_ZOOM = 6;

  // Leaflet map state. Initialized in onMount (browser-only).
  let mapContainerEl;
  let leafletMap = null;
  let leafletReady = $state(false);
  let videoCardReady = $state(false);
  let allMarkers = new Map(); // locationKey -> L.Marker (persistent)
  let prevActiveIndex = -1;
  let autoAdvancedFrom = new Set(); // step indices we've already auto-advanced from

  function leafletTargetForStep(step) {
    if (!step) return null;
    if (step.kind === 'map-intro') return { center: [20, 0], zoom: 2 };
    if (step.kind === 'video') {
      const c = COORDS[step.locationKey];
      if (!c) return null;
      return { center: [c[1], c[0]], zoom: VIDEO_ZOOM };
    }
    if (step.kind === 'map-home') {
      return { center: [HOME[1], HOME[0]], zoom: 11 };
    }
    return null;
  }

  function setActiveMarker(key) {
    for (const [k, m] of allMarkers) {
      const el = m.getElement();
      if (el) el.classList.toggle('active', k === key);
    }
  }

  $effect(() => {
    if (!leafletReady || !leafletMap) return;
    const step = steps[activeIndex];
    const prevStep = prevActiveIndex >= 0 ? steps[prevActiveIndex] : null;
    prevActiveIndex = activeIndex;

    const target = leafletTargetForStep(step);

    // Highlight the active marker (persistent markers stay shown either way).
    setActiveMarker(step?.locationKey ?? null);

    // Hide any current video card while the map transitions.
    videoCardReady = false;

    if (!target) return;

    // Same location as the previous video step → don't move the map,
    // just pop the next video card in.
    const sameLocation =
      step.kind === 'video' &&
      prevStep?.kind === 'video' &&
      step.locationKey === prevStep.locationKey;

    if (sameLocation) {
      requestAnimationFrame(() => { videoCardReady = true; });
      return;
    }

    // Otherwise fly, then reveal video on moveend.
    const settledIndex = activeIndex;
    const onMoveEnd = () => {
      leafletMap.off('moveend', onMoveEnd);
      if (step.kind === 'video') videoCardReady = true;
      // After landing in Huntsville, auto-advance to the surprise-party
      // step so the user doesn't have to scroll. Only do it once per
      // visit (so scrolling back doesn't trap them in a loop).
      if (step.kind === 'map-home' && !autoAdvancedFrom.has(settledIndex)) {
        autoAdvancedFrom.add(settledIndex);
        setTimeout(() => {
          if (activeIndex !== settledIndex) return; // user moved on already
          const next = storyEl?.querySelectorAll('.step')[settledIndex + 1];
          if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 1200);
      }
    };
    leafletMap.on('moveend', onMoveEnd);

    leafletMap.flyTo(target.center, target.zoom, {
      duration: 1.6,
      easeLinearity: 0.25,
    });
  });

  let videoMuted = $state(false);

  function toggleMute() {
    videoMuted = !videoMuted;
  }

  let isFullscreen = $state(false);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      const el = document.documentElement;
      const req = el.requestFullscreen
        ?? el.webkitRequestFullscreen
        ?? el.mozRequestFullScreen
        ?? el.msRequestFullscreen;
      req?.call(el).catch(() => {});
    } else {
      const exit = document.exitFullscreen
        ?? document.webkitExitFullscreen
        ?? document.mozCancelFullScreen
        ?? document.msExitFullscreen;
      exit?.call(document);
    }
  }

  // Browsers block unmuted autoplay until the user has interacted with
  // the page. If the unmuted play() rejects, fall back to muted (and
  // sync videoMuted so the toggle reflects reality).
  function recoverFromAutoplayBlock(e) {
    const v = e.currentTarget;
    if (!v) return;
    const p = v.play();
    if (p && p.catch) {
      p.catch(() => {
        v.muted = true;
        videoMuted = true;
        v.play().catch(() => {});
      });
    }
  }

  let examIdx = $state(0);
  let examTimer = null;

  $effect(() => {
    if (examTimer) {
      clearInterval(examTimer);
      examTimer = null;
    }
    examIdx = 0;
    if (activeKind === 'late-nights') {
      const list = steps[activeIndex]?.examBubbles ?? [];
      if (list.length > 1) {
        examTimer = setInterval(() => {
          examIdx = (examIdx + 1) % list.length;
        }, 1600);
      }
    }
    return () => {
      if (examTimer) clearInterval(examTimer);
    };
  });

  function mdInline(text) {
    if (!text) return '';
    let s = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  onMount(async () => {
    const categoryEl = rootEl.closest('[data-post-category]');
    const category = categoryEl?.dataset.postCategory;
    backHref = resolveBack(category ? `/${category}` : '/');

    // Lazy-load Leaflet from CDN (browser only). Avoids needing to resolve
    // through the bundler's module graph (which doesn't see Yarn PnP here).
    if (!document.querySelector('link[data-leaflet-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      link.dataset.leafletCss = '1';
      document.head.appendChild(link);
    }
    if (!window.L) {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-leaflet-js]');
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', reject);
          return;
        }
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        s.crossOrigin = '';
        s.dataset.leafletJs = '1';
        s.onload = () => resolve();
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const L = window.L;
    if (!L) return;
    if (mapContainerEl && !leafletMap) {
      leafletMap = L.map(mapContainerEl, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomAnimation: true,
        worldCopyJump: false,
      }).setView([20, 0], 2);

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          minZoom: 1,
          maxZoom: 14,
        },
      ).addTo(leafletMap);

      // Build persistent markers, one per unique location, with the
      // names of every contributor at that location.
      const namesByKey = new Map();
      for (const s of steps) {
        if ((s.kind === 'video' || s.kind === 'map-home') && s.locationKey && COORDS[s.locationKey]) {
          if (!namesByKey.has(s.locationKey)) namesByKey.set(s.locationKey, []);
          namesByKey.get(s.locationKey).push(s.name ?? '');
        }
      }
      for (const [key, names] of namesByKey) {
        const c = COORDS[key];
        if (!c) continue;
        const label = [...new Set(names.filter(Boolean))].join(' · ');
        const html = `<span class="pin">📍</span><span class="name">${label}</span>`;
        const icon = L.divIcon({
          className: 'grad-marker',
          html,
          iconSize: [220, 48],
          iconAnchor: [12, 44],
        });
        const m = L.marker([c[1], c[0]], { icon, interactive: false }).addTo(leafletMap);
        allMarkers.set(key, m);
      }

      // Force a tile recompute once the panel becomes visible.
      requestAnimationFrame(() => {
        leafletMap.invalidateSize();
        leafletReady = true;
      });
    }

    const stepObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeIndex = Number(entry.target.dataset.index);
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    const sections = storyEl.querySelectorAll('.step');
    sections.forEach((s) => stepObserver.observe(s));

    const rootObserver = new IntersectionObserver(
      ([entry]) => { inView = entry.isIntersecting; },
      { threshold: 0 }
    );
    rootObserver.observe(rootEl);

    function onUserScroll() {
      if (autoplay) stopAutoplay();
    }
    function onKeyDown(e) {
      if (['ArrowDown','ArrowUp','PageDown','PageUp','Space','Home','End'].includes(e.code)) {
        onUserScroll();
        return;
      }
      // 'F' (no modifiers) toggles fullscreen — handy while casting.
      if (e.code === 'KeyF' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        toggleFullscreen();
      }
    }
    function onFullscreenChange() {
      isFullscreen = !!document.fullscreenElement;
    }
    window.addEventListener('wheel', onUserScroll, { passive: true });
    window.addEventListener('touchstart', onUserScroll, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    return () => {
      stepObserver.disconnect();
      rootObserver.disconnect();
      window.removeEventListener('wheel', onUserScroll);
      window.removeEventListener('touchstart', onUserScroll);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      clearAutoplayTimer();
      if (leafletMap) {
        leafletMap.remove();
        leafletMap = null;
        leafletReady = false;
      }
      allMarkers.clear();
      prevActiveIndex = -1;
      autoAdvancedFrom.clear();
    };
  });
</script>

<div class="scrollytelling" bind:this={rootEl}>
  <a class="back-link" class:hidden={!inView} href={backHref} onclick={handleBack}>&lt;&lt; go back</a>

  <button
    class="play-button"
    class:hidden={!inView}
    class:playing={autoplay}
    type="button"
    onclick={() => {
      if (autoplay) {
        stopAutoplay();
      } else if (activeIndex >= steps.length - 1) {
        const first = storyEl?.querySelectorAll('.step')[0];
        if (first) first.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => startAutoplay(), 600);
      } else {
        startAutoplay();
      }
    }}
  >
    {#if autoplay}⏸ pause{:else if activeIndex >= steps.length - 1}↻ replay{:else}▶ play{/if}
  </button>

  <button
    class="fullscreen-button"
    class:hidden={!inView}
    type="button"
    title="Toggle fullscreen (F)"
    onclick={toggleFullscreen}
  >
    {isFullscreen ? '⛶ exit' : '⛶ fullscreen'}
  </button>

  <div class="progress-indicator" class:hidden={!inView}>
    {String(activeIndex + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
  </div>

  <div class="progress-bar" class:hidden={!inView}>
    <div
      class="progress-bar-fill"
      style="height: {((activeIndex + 1) / steps.length) * 100}%"
    ></div>
  </div>

  <div class="grid">
    <div class="visual-side">
      <div class="panel" class:visible={activePanel === 'photo'}>
        <div
          class="photo-stage"
          class:cap={['intro-skit-cap','intro-skit-degree','flying-colors'].includes(activeKind)}
          class:degree={['intro-skit-degree','flying-colors'].includes(activeKind)}
          class:tears={activeKind === 'late-nights'}
          class:flying={activeKind === 'flying-colors'}
        >
          <img
            class="caden-img"
            src={activeKind === 'flying-colors' ? cadenTriumphantPhoto
               : activeKind === 'late-nights' ? cadenCryingPhoto
               : cadenPhoto}
            alt="Caden"
          />

          <div class="overlay cap-overlay">🎓</div>
          <div class="overlay degree-overlay">
            <div class="frame">
              <div class="parchment">M.S.<br/>Computer<br/>Science</div>
            </div>
          </div>

          <div class="overlay tear left">💧</div>
          <div class="overlay tear right">💧</div>
          <div class="overlay exam-bubble">
            <span class="bubble-text">{steps[activeIndex]?.examBubbles?.[examIdx] ?? ''}</span>
          </div>

          <div class="flying-stage">
            {#each ['#ff6b6b','#feca57','#48dbfb','#1dd1a1','#5f27cd','#ff9ff3','#54a0ff','#ee5253'] as color, i}
              <div class="winged-square" style="--c: {color}; --i: {i};">
                <span class="wing left">🪽</span>
                <span class="square" style="background: {color}"></span>
                <span class="wing right">🪽</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
      <div class="panel map-panel" class:visible={activePanel === 'map'}>
        <div class="map-frame">
          <div class="leaflet-host" bind:this={mapContainerEl}></div>
          {#if steps[activeIndex]?.kind === 'video' && steps[activeIndex]?.src && videoCardReady}
            {#key activeIndex}
              <div class="video-card">
                <video
                  src={steps[activeIndex].src}
                  muted={videoMuted}
                  autoplay
                  playsinline
                  preload="auto"
                  onloadedmetadata={recoverFromAutoplayBlock}
                  onended={() => {
                    if (autoplay) {
                      const next = storyEl?.querySelectorAll('.step')[activeIndex + 1];
                      if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                ></video>
                <button class="mute-toggle" type="button" onclick={toggleMute}>
                  {videoMuted ? '🔇 unmute' : '🔊 mute'}
                </button>
              </div>
            {/key}
          {/if}
        </div>
      </div>
      <div class="panel" class:visible={activePanel === 'ending'}>
        <div class="party-card">
          <!-- SWAP POINT: replace this block with <img src="/squiggly-lines/images/party.jpg" /> after the surprise party. -->
          <div class="placeholder-party">
            🎉<br/>
            <strong>the surprise party</strong><br/>
            <span>photos land here<br/>tomorrow</span><br/>
            🎉
          </div>
        </div>
      </div>
    </div>

    <div class="story-side" bind:this={storyEl}>
      {#each steps as step, i}
        <section class="step" data-index={i} class:active={i === activeIndex}>
          {#if (step.kind === 'video' || step.kind === 'map-home') && step.name && step.locationKey}
            <div class="bubble">
              <span class="step-num">{String(i + 1).padStart(2, '0')}</span>
              <span class="bubble-name">{step.name}</span>
              <div class="bubble-location">{LOCATION_LABELS[step.locationKey] ?? ''}</div>
              {#if !step.src && step.kind === 'video'}
                <div class="bubble-subnote">(video on the way…)</div>
              {/if}
            </div>
          {:else if step.caption}
            <div class="bubble">
              <span class="step-num">{String(i + 1).padStart(2, '0')}</span>
              <p>{@html mdInline(step.caption)}</p>
            </div>
          {/if}
        </section>
      {/each}
    </div>
  </div>

</div>

<style>
  .scrollytelling {
    position: relative;
    background: var(--bg-color);
  }

  .back-link {
    position: fixed;
    top: 3rem;
    left: 1rem;
    z-index: 20;
    font-size: 14px;
    color: var(--accent-color);
    background: var(--bg-color);
    padding: 6px 12px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    text-decoration: none;
    transition: opacity 0.3s ease, transform 0.2s ease;
  }
  .back-link:hover {
    text-decoration: underline;
    transform: translateX(-2px);
  }

  .progress-indicator {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 20;
    font-size: 14px;
    color: var(--accent-color);
    background: var(--bg-color);
    padding: 6px 12px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    letter-spacing: 0.05em;
    transition: opacity 0.3s ease;
  }

  .progress-bar {
    position: fixed;
    top: 50%;
    right: 1rem;
    transform: translateY(-50%);
    width: 3px;
    height: 40vh;
    background: var(--border-color);
    border-radius: 2px;
    z-index: 20;
    overflow: hidden;
    transition: opacity 0.3s ease;
  }
  .progress-bar-fill {
    width: 100%;
    background: var(--accent-color);
    transition: height 0.4s ease;
  }

  .hidden {
    opacity: 0;
    pointer-events: none;
  }

  .grid {
    display: block;
    position: relative;
  }

  .visual-side {
    position: sticky;
    top: 0;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: var(--bg-color);
    z-index: 1;
  }

  .panel {
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.6s ease;
  }
  .panel.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .placeholder {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: monospace;
    font-size: 1.5rem;
    color: var(--accent-color);
    border: 1px dashed var(--border-color);
    padding: 1rem 2rem;
  }

  .story-side {
    position: relative;
    margin-top: -100vh;
    z-index: 1500;
    pointer-events: none;
  }

  .step {
    min-height: 100vh;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    padding: 0 0 3.5rem 3rem;
    pointer-events: none;
  }

  .bubble {
    pointer-events: auto;
    background: var(--bg-color);
    border: 3px solid var(--border-color);
    border-radius: 14px;
    padding: 2rem 2.5rem;
    box-shadow: 5px 8px 28px rgba(0, 0, 0, 0.32);
    transform: rotate(-0.6deg);
    transition: transform 0.5s ease, opacity 0.5s ease, box-shadow 0.5s ease;
    opacity: 0;
    max-width: 760px;
  }

  .step:nth-child(even) .bubble { transform: rotate(0.5deg); }

  .step.active .bubble {
    opacity: 1;
    transform: rotate(0deg) scale(1.02);
    box-shadow: 6px 10px 32px rgba(0, 0, 0, 0.4);
  }

  .step-num {
    display: inline-block;
    font-size: 3.2rem;
    font-weight: bold;
    color: var(--accent-color);
    margin-right: 0.8rem;
    line-height: 1;
    vertical-align: middle;
  }

  .bubble p {
    display: inline;
    font-size: 1.85rem;
    color: var(--text-color);
    line-height: 1.45;
  }

  .bubble-name {
    display: inline;
    font-size: 2.2rem;
    font-weight: bold;
    color: var(--accent-color);
    line-height: 1;
    vertical-align: middle;
  }
  .bubble-location {
    margin-top: 0.5rem;
    font-size: 1.3rem;
    color: var(--text-color);
    line-height: 1.3;
  }
  .bubble-subnote {
    margin-top: 0.4rem;
    font-size: 1rem;
    color: var(--text-color);
    opacity: 0.65;
    font-style: italic;
  }
  .bubble p :global(strong) {
    color: var(--accent-color);
    font-weight: bold;
  }
  .bubble p :global(em) { font-style: italic; }
  .bubble p :global(code) {
    font-family: system-ui, -apple-system, monospace;
    font-size: 0.95em;
    background: var(--border-color);
    padding: 1px 6px;
    border-radius: 3px;
  }
  .bubble p :global(a) {
    color: var(--link-color);
    border-bottom: 1px solid currentColor;
  }

  @media (max-width: 780px) {
    .step {
      padding: 0 1.25rem 5rem 1.25rem;
    }
    .bubble {
      max-width: 100%;
      padding: 1.25rem 1.5rem;
    }
    .bubble p { font-size: 1.4rem; }
    .step-num { font-size: 2.4rem; }
    .progress-bar { height: 30vh; }
    :global(.grad-marker .name) { font-size: 0.7rem; }
    :global(.grad-marker.active .name) { font-size: 0.9rem; }
  }

  .photo-stage {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .caden-img {
    max-height: 90%;
    max-width: 60%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 4px 6px 18px rgba(0, 0, 0, 0.22);
    transition: opacity 0.5s ease;
  }

  .overlay {
    position: absolute;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  /* Cap */
  .cap-overlay {
    font-size: 14rem;
    top: 15%;
    left: 45%;
    transform: translateX(-50%) translateY(-150%);
  }
  .photo-stage.cap .cap-overlay {
    opacity: 1;
    animation: cap-drop 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  @keyframes cap-drop {
    0% { transform: translateX(-50%) translateY(-150%) rotate(-30deg); }
    60% { transform: translateX(-50%) translateY(10%) rotate(8deg); }
    100% { transform: translateX(-50%) translateY(-2%) rotate(-3deg); }
  }

  /* Degree */
  .degree-overlay {
    bottom: 4%;
    left: 50%;
    transform: translateX(-50%) translateY(120%) rotate(-4deg);
  }
  .photo-stage.degree .degree-overlay {
    opacity: 1;
    animation: degree-thud 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  @keyframes degree-thud {
    0% { transform: translateX(-50%) translateY(120%) rotate(-12deg); }
    70% { transform: translateX(-50%) translateY(-6%) rotate(2deg); }
    100% { transform: translateX(-50%) translateY(0) rotate(-4deg); }
  }
  .frame {
    width: 280px;
    height: 200px;
    background: #d4a574;
    border: 8px solid #6b3410;
    box-shadow: 6px 8px 22px rgba(0,0,0,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .parchment {
    background: #f8e9c1;
    width: 90%;
    height: 88%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Times New Roman', serif;
    font-size: 1.4rem;
    font-weight: bold;
    text-align: center;
    color: #3a1d05;
  }

  /* Tears + exam bubble (late-nights) */
  .tear {
    font-size: 3rem;
    top: 30%;
  }
  .tear.left  { left: calc(50% - 80px); }
  .tear.right { left: calc(50% + 50px); }
  .photo-stage.tears .tear {
    opacity: 1;
    animation: tear-drip 1.2s ease-in infinite;
  }
  @keyframes tear-drip {
    0% { transform: translateY(0); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translateY(120px); opacity: 0; }
  }

  .exam-bubble {
    top: 18%;
    right: 6%;
    background: var(--bg-color);
    border: 3px solid var(--border-color);
    border-radius: 18px;
    padding: 14px 20px;
    font-size: 1.4rem;
    font-weight: bold;
    color: var(--accent-color);
    max-width: 280px;
    transform: rotate(4deg);
  }
  .exam-bubble::after {
    content: '';
    position: absolute;
    bottom: -16px;
    left: 30px;
    width: 0; height: 0;
    border: 12px solid transparent;
    border-top-color: var(--bg-color);
  }
  .photo-stage.tears .exam-bubble {
    opacity: 1;
    animation: bubble-flicker 1.6s ease-in-out infinite;
  }
  @keyframes bubble-flicker {
    0%, 100% { transform: rotate(4deg) scale(1); }
    10% { transform: rotate(4deg) scale(1.06); }
    50% { transform: rotate(2deg) scale(0.98); }
  }

  /* Flying colors */
  .flying-stage {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .photo-stage.flying .flying-stage { opacity: 1; }

  .winged-square {
    position: absolute;
    top: calc(15% + var(--i) * 10%);
    left: -20%;
    display: flex;
    align-items: center;
    gap: 4px;
    animation: wing-fly 2.6s ease-in forwards;
    animation-delay: calc(var(--i) * 0.18s);
    opacity: 0;
  }
  .photo-stage.flying .winged-square { opacity: 1; }
  .square {
    width: 36px;
    height: 36px;
    display: inline-block;
    border: 2px solid rgba(0,0,0,0.6);
    box-shadow: 2px 3px 0 rgba(0,0,0,0.4);
  }
  .wing { font-size: 1.6rem; }
  .wing.left  { transform: scaleX(-1); }
  @keyframes wing-fly {
    0% { transform: translate(0, 0) rotate(-4deg); }
    50% { transform: translate(60vw, -40px) rotate(6deg); }
    100% { transform: translate(140vw, 30px) rotate(-2deg); }
  }

  /* Map panel */
  .map-frame {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--bg-color);
  }

  .leaflet-host {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: #e8e6df;
  }
  /* Leaflet attribution box — make readable in dark mode too */
  :global(.leaflet-control-attribution) {
    font-size: 10px !important;
    background: rgba(255, 255, 255, 0.85) !important;
  }

  /* Custom Leaflet marker (📍 emoji + name label) */
  :global(.grad-marker) {
    display: flex !important;
    align-items: center;
    pointer-events: none;
    white-space: nowrap;
  }
  :global(.grad-marker .pin) {
    font-size: 1.4rem;
    line-height: 1;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.35));
    transition: font-size 0.3s ease;
  }
  :global(.grad-marker .name) {
    margin-left: 4px;
    padding: 2px 8px;
    background: var(--bg-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 0.78rem;
    font-weight: 500;
    box-shadow: 1px 1px 5px rgba(0,0,0,0.18);
    transition: all 0.3s ease;
  }
  :global(.grad-marker.active .pin) {
    font-size: 2.4rem;
    animation: pin-bob 1.8s ease-in-out infinite;
  }
  :global(.grad-marker.active .name) {
    font-size: 1rem;
    font-weight: 700;
    background: var(--accent-color);
    color: var(--bg-color);
    border-color: var(--accent-color);
    padding: 4px 12px;
  }
  @keyframes pin-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  /* Video card overlay — front-and-center, dominates the panel */
  .video-card {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 92%;
    height: 88%;
    background: var(--bg-color);
    border: 6px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 10px 12px 36px rgba(0, 0, 0, 0.4);
    z-index: 1000;
    padding: 10px 10px 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: video-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    transform-origin: 50% 50%;
  }
  @keyframes video-pop {
    0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
    70%  { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
    100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  .video-card video {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    background: #000;
  }
  .mute-toggle {
    position: absolute;
    bottom: 4px;
    right: 4px;
    background: var(--bg-color);
    color: var(--accent-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .mute-toggle:hover {
    background: var(--accent-color);
    color: var(--bg-color);
  }

  @media (max-width: 780px) {
    .video-card {
      width: 94%;
      height: 92%;
      padding: 6px 6px 32px;
    }

    .photo-stage .cap-overlay { font-size: 5rem; }
    .frame { width: 200px; height: 150px; }
    .parchment { font-size: 1.1rem; }
    .exam-bubble { font-size: 1.1rem; right: 4%; max-width: 200px; }
    .placeholder-party { padding: 1.5rem 2rem; font-size: 1.1rem; }
    .placeholder-party strong { font-size: 1.5rem; }
    .play-button { top: 5rem; }
  }

  .party-card {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .placeholder-party {
    background: var(--bg-color);
    border: 4px dashed var(--border-color);
    border-radius: 12px;
    padding: 2.5rem 3rem;
    text-align: center;
    font-size: 1.4rem;
    color: var(--text-color);
    transform: rotate(-1.5deg);
    box-shadow: 4px 6px 18px rgba(0,0,0,0.18);
  }
  .placeholder-party strong {
    font-size: 2rem;
    color: var(--accent-color);
    display: block;
    margin: 0.5rem 0;
  }
  .placeholder-party span {
    font-size: 1rem;
    color: var(--text-color);
    opacity: 0.7;
  }


  .play-button {
    position: fixed;
    top: 6rem;
    left: 1rem;
    z-index: 21;
    background: var(--accent-color);
    color: var(--bg-color);
    border: 2px solid var(--border-color);
    border-radius: 6px;
    padding: 8px 18px;
    font: inherit;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: 3px 4px 12px rgba(0,0,0,0.2);
    transition: opacity 0.3s ease, transform 0.2s ease;
  }
  .play-button:hover { transform: translateY(-1px); }
  .play-button.playing {
    background: var(--bg-color);
    color: var(--accent-color);
  }

  .fullscreen-button {
    position: fixed;
    top: 9.5rem;
    left: 1rem;
    z-index: 21;
    background: var(--bg-color);
    color: var(--accent-color);
    border: 2px solid var(--border-color);
    border-radius: 6px;
    padding: 6px 14px;
    font: inherit;
    font-size: 0.9rem;
    cursor: pointer;
    box-shadow: 3px 4px 12px rgba(0,0,0,0.18);
    transition: opacity 0.3s ease, transform 0.2s ease;
  }
  .fullscreen-button:hover {
    background: var(--accent-color);
    color: var(--bg-color);
    transform: translateY(-1px);
  }
</style>
