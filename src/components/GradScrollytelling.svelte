<script>
  import { onMount } from 'svelte';

  let {
    cadenPhoto,
    cadenTriumphantPhoto,
    worldMap,
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
    'intro-greeting', 'intro-skit-cap', 'intro-skit-gown', 'intro-skit-degree',
    'late-nights', 'flying-colors',
  ]);
  const MAP_KINDS = new Set(['map-intro', 'video', 'map-home']);
  const ENDING_KINDS = new Set(['ending']);
  const OUTTAKES_KINDS = new Set(['outtakes']);

  const activeKind = $derived(steps[activeIndex]?.kind ?? 'intro-greeting');
  const activePanel = $derived(
    PHOTO_KINDS.has(activeKind) ? 'photo'
    : MAP_KINDS.has(activeKind) ? 'map'
    : ENDING_KINDS.has(activeKind) ? 'ending'
    : OUTTAKES_KINDS.has(activeKind) ? 'outtakes'
    : 'photo'
  );

  const HOME = [-86.5861, 34.7304]; // Huntsville, AL

  const COORDS = {
    saudiarabia:    [46.6753, 24.7136],   // Riyadh
    nepal:          [85.32,   27.72],     // Kathmandu
    pennsylvinia:   [-77.2,   41.2],      // PA center
    northcarolina:  [-79.0,   35.5],      // NC center
    atlanta:        [-84.39,  33.75],
    nashville:      [-86.78,  36.16],
    texas:          [-99.0,   31.5],      // TX center
    phoenixalabama: [-85.0,   32.47],     // Phenix City, AL
    alabama:        [-86.79,  33.5],      // Alabama state-ish
    huntsville:     HOME,
  };

  const LOCATION_LABELS = {
    saudiarabia:    'Riyadh, Saudi Arabia',
    nepal:          'Kathmandu, Nepal',
    pennsylvinia:   'Pennsylvania, USA',
    northcarolina:  'North Carolina, USA',
    atlanta:        'Atlanta, GA',
    nashville:      'Nashville, TN',
    texas:          'Texas, USA',
    phoenixalabama: 'Phenix City, AL',
    alabama:        'Alabama, USA',
    huntsville:     'Huntsville, AL',
  };

  const BLOOPERS = [
    '/squiggly-lines/videos/CHG Videos/bloopers/Mamu&DaddyBloopers.mp4',
    '/squiggly-lines/videos/CHG Videos/bloopers/Mamu&DaddyBloopers1.mp4',
    '/squiggly-lines/videos/CHG Videos/bloopers/Mamu&DaddyBloopers2.mp4',
    '/squiggly-lines/videos/CHG Videos/bloopers/Mom&Addison2.mp4',
  ];

  const showBlooper = $derived(MAP_KINDS.has(activeKind));
  const blooperIdx = $derived(activeIndex % BLOOPERS.length);
  const blooperDimmed = $derived(activeKind === 'video');

  // Equirectangular projection on a 1000x500 viewBox.
  // Returns CSS transform that centers (lng,lat) in a 100% panel at given zoom.
  function flyTransform(coords, zoom = 1) {
    if (!coords) return 'translate(0, 0) scale(1)';
    const [lng, lat] = coords;
    // Coords on the SVG (origin top-left, 0..1000 / 0..500):
    const x = (lng + 180) / 360 * 1000;
    const y = (90 - lat) / 180 * 500;
    // We want (x, y) at the panel center after scaling.
    // Center of the unscaled map is (500, 250).
    const dx = (500 - x) * zoom;
    const dy = (250 - y) * zoom;
    return `translate(${dx / 10}%, ${dy / 5}%) scale(${zoom})`;
  }

  const mapTransform = $derived.by(() => {
    const step = steps[activeIndex];
    if (!step) return flyTransform(null, 1);
    if (step.kind === 'map-intro') return flyTransform([0, 20], 1);
    if (step.kind === 'video') return flyTransform(COORDS[step.locationKey] ?? null, step.zoom ?? 6);
    if (step.kind === 'map-home') return flyTransform(HOME, 11);
    return flyTransform(null, 1);
  });

  let videoEl;
  let videoMuted = $state(true);

  function toggleMute() {
    videoMuted = !videoMuted;
  }

  $effect(() => {
    // Re-runs when activeIndex changes; videoEl is the (re-bound) <video>.
    if (videoEl && steps[activeIndex]?.kind === 'video') {
      videoEl.currentTime = 0;
      videoEl.muted = videoMuted;
      const playPromise = videoEl.play();
      if (playPromise && playPromise.catch) {
        playPromise.catch(() => { /* autoplay blocked; user must tap */ });
      }
    }
  });

  let outtakeIdx = $state(0);
  let outtakeFin = $state(false);

  $effect(() => {
    if (activeKind === 'outtakes') {
      outtakeIdx = 0;
      outtakeFin = false;
    }
  });

  function advanceOuttake() {
    if (outtakeIdx < BLOOPERS.length - 1) {
      outtakeIdx += 1;
    } else {
      outtakeFin = true;
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

  onMount(() => {
    const categoryEl = rootEl.closest('[data-post-category]');
    const category = categoryEl?.dataset.postCategory;
    backHref = resolveBack(category ? `/${category}` : '/');

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
    window.addEventListener('wheel', onUserScroll, { passive: true });
    window.addEventListener('touchstart', onUserScroll, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (['ArrowDown','ArrowUp','PageDown','PageUp','Space','Home','End'].includes(e.code)) {
        onUserScroll();
      }
    });

    return () => {
      stepObserver.disconnect();
      rootObserver.disconnect();
      window.removeEventListener('wheel', onUserScroll);
      window.removeEventListener('touchstart', onUserScroll);
      clearAutoplayTimer();
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
          class:cap={['intro-skit-cap','intro-skit-gown','intro-skit-degree','late-nights','flying-colors'].includes(activeKind)}
          class:gown={['intro-skit-gown','intro-skit-degree','late-nights','flying-colors'].includes(activeKind)}
          class:degree={['intro-skit-degree','late-nights','flying-colors'].includes(activeKind)}
          class:tears={activeKind === 'late-nights'}
          class:flying={activeKind === 'flying-colors'}
        >
          <img class="caden-img" src={activeKind === 'flying-colors' ? cadenTriumphantPhoto : cadenPhoto} alt="Caden" />

          <div class="overlay cap-overlay">🎓</div>
          <div class="overlay gown-overlay">🥋</div>
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
      <div class="panel" class:visible={activePanel === 'map'}>
        <div class="map-frame">
          <img
            class="world-map"
            src={worldMap}
            alt="World map"
            style="transform: {mapTransform};"
          />
          {#if steps[activeIndex]?.kind === 'video' || steps[activeIndex]?.kind === 'map-home'}
            <div class="map-pin">📍</div>
            <div class="map-label">
              <strong>{steps[activeIndex]?.name ?? ''}</strong>
              <span>{LOCATION_LABELS[steps[activeIndex]?.locationKey] ?? ''}</span>
            </div>
          {/if}
          {#if steps[activeIndex]?.kind === 'video' && steps[activeIndex]?.src}
            {#key activeIndex}
              <div class="video-card">
                <video
                  bind:this={videoEl}
                  src={steps[activeIndex].src}
                  muted={videoMuted}
                  playsinline
                  preload="metadata"
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
      <div class="panel" class:visible={activePanel === 'outtakes'}>
        {#if outtakeFin}
          <div class="fin-card">fin.</div>
        {:else}
          {#key outtakeIdx}
            <video
              class="outtake-reel"
              src={BLOOPERS[outtakeIdx]}
              autoplay
              playsinline
              preload="metadata"
              onended={advanceOuttake}
            ></video>
          {/key}
        {/if}
      </div>
    </div>

    <div class="story-side" bind:this={storyEl}>
      {#each steps as step, i}
        <section class="step" data-index={i} class:active={i === activeIndex}>
          <div class="bubble">
            <span class="step-num">{String(i + 1).padStart(2, '0')}</span>
            <p>{@html mdInline(step.caption)}</p>
          </div>
        </section>
      {/each}
    </div>
  </div>

  {#if showBlooper && inView}
    {#key blooperIdx}
      <video
        class="blooper-pip"
        class:dim={blooperDimmed}
        src={BLOOPERS[blooperIdx]}
        muted
        autoplay
        loop
        playsinline
        preload="metadata"
      ></video>
    {/key}
  {/if}
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
    display: grid;
    grid-template-columns: 3fr 2fr;
  }

  .visual-side {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
    background: var(--bg-color);
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
    padding: 0 3rem 0 2rem;
  }

  .step {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 2rem 0;
  }

  .bubble {
    background: var(--bg-color);
    border: 2px solid var(--border-color);
    border-radius: 10px;
    padding: 1.5rem 2rem;
    box-shadow: 3px 5px 14px rgba(0, 0, 0, 0.12);
    transform: rotate(-0.6deg);
    transition: transform 0.5s ease, opacity 0.5s ease, box-shadow 0.5s ease;
    opacity: 0.35;
    max-width: 460px;
  }

  .step:nth-child(even) .bubble { transform: rotate(0.5deg); }

  .step.active .bubble {
    opacity: 1;
    transform: rotate(0deg) scale(1.02);
    box-shadow: 4px 7px 18px rgba(0, 0, 0, 0.18);
  }

  .step-num {
    display: inline-block;
    font-size: 2.2rem;
    font-weight: bold;
    color: var(--accent-color);
    margin-right: 0.6rem;
    line-height: 1;
    vertical-align: middle;
  }

  .bubble p {
    display: inline;
    font-size: 1.3rem;
    color: var(--text-color);
    line-height: 1.5;
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
    .grid { grid-template-columns: 1fr; }
    .visual-side { height: 65vh; position: sticky; top: 0; }
    .story-side { padding: 0 1.25rem; }
    .step { min-height: 65vh; }
    .bubble { max-width: 100%; }
    .progress-bar { height: 30vh; }
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
    font-size: 8rem;
    top: 8%;
    left: 50%;
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

  /* Gown */
  .gown-overlay {
    font-size: 16rem;
    top: 38%;
    left: 50%;
    transform: translateX(-50%) scaleY(0.7);
    filter: drop-shadow(0 0 10px rgba(0,0,0,0.2));
  }
  .photo-stage.gown .gown-overlay {
    opacity: 0.9;
    animation: gown-fade 0.7s ease forwards;
  }
  @keyframes gown-fade {
    from { opacity: 0; transform: translateX(-50%) scaleY(0.7); }
    to   { opacity: 0.9; transform: translateX(-50%) scaleY(1); }
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

  .world-map {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: auto;
    aspect-ratio: 2 / 1;
    margin-top: -25%;
    margin-left: -50%;
    color: var(--accent-color);
    transition: transform 1.8s cubic-bezier(0.65, 0, 0.35, 1);
    will-change: transform;
  }

  .map-pin {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -100%);
    font-size: 3rem;
    z-index: 2;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
    animation: pin-bob 2.4s ease-in-out infinite;
  }
  @keyframes pin-bob {
    0%, 100% { transform: translate(-50%, -100%) translateY(0); }
    50% { transform: translate(-50%, -100%) translateY(-8px); }
  }

  .map-label {
    position: absolute;
    bottom: 8%;
    left: 50%;
    transform: translateX(-50%) rotate(-1deg);
    background: var(--bg-color);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    padding: 10px 18px;
    text-align: center;
    z-index: 2;
    box-shadow: 3px 4px 12px rgba(0,0,0,0.18);
  }
  .map-label strong {
    display: block;
    color: var(--accent-color);
    font-size: 1.3rem;
  }
  .map-label span {
    display: block;
    color: var(--text-color);
    font-size: 0.95rem;
  }

  /* Video card overlay */
  .video-card {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-1.5deg);
    width: min(50vw, 540px);
    max-height: 70vh;
    background: var(--bg-color);
    border: 6px solid var(--border-color);
    border-radius: 4px;
    box-shadow: 8px 10px 30px rgba(0, 0, 0, 0.35);
    z-index: 3;
    padding: 8px 8px 36px;
  }
  .video-card video {
    width: 100%;
    max-height: 60vh;
    display: block;
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

  .blooper-pip {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    width: 240px;
    height: 180px;
    object-fit: cover;
    border: 4px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 4px 6px 18px rgba(0,0,0,0.3);
    transform: rotate(2deg);
    background: #000;
    z-index: 25;
    transition: opacity 0.4s ease;
    opacity: 1;
  }
  .blooper-pip.dim { opacity: 0.3; }

  @media (max-width: 780px) {
    .blooper-pip {
      width: 160px;
      height: 120px;
      bottom: 0.5rem;
      right: 0.5rem;
    }
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

  .outtake-reel {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
  }

  .fin-card {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Times New Roman', serif;
    font-size: 8rem;
    font-style: italic;
    color: var(--accent-color);
    background: var(--bg-color);
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
</style>
