<script>
  import { onMount } from 'svelte';

  let { title = '', src, steps = [], home = [-86.5861, 34.7304], homeZoom = 4 } = $props();

  let activeIndex = $state(0);
  let inView = $state(true);
  let rootEl;
  let storyEl;
  let iframeEl;
  let backHref = $state('/');
  let ready = $state(false);
  let iframeSrc = $state('');
  let iframeOrigin = $state('');
  let hintDismissed = $state(false);

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

  function stripMd(text) {
    if (!text) return '';
    return String(text)
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/\s*\n\s*/g, ' ');
  }

  function post(msg) {
    const win = iframeEl?.contentWindow;
    if (!win) return;
    console.log('[bigfoot →]', msg, 'targetOrigin=', iframeOrigin || '*');
    win.postMessage(msg, iframeOrigin || '*');
  }

  function currentTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    return t === 'dark' ? 'dark' : 'light';
  }

  function plain(v) {
    return v == null ? v : JSON.parse(JSON.stringify(v));
  }

  let lastSent = {
    layers: null,
    yearRange: null,
    highlight: null,
  };

  function sameJson(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function applyStep(idx) {
    const step = steps[idx];
    if (!step) return;
    if (step.reset) {
      post({ type: 'bigfoot:reset' });
      lastSent = { layers: null, yearRange: null, highlight: null };
    }
    if (step.layers) {
      const next = plain(step.layers);
      if (!sameJson(next, lastSent.layers)) {
        post({ type: 'bigfoot:setLayers', layers: next });
        lastSent.layers = next;
      }
    }
    if (step.yearRange) {
      const next = plain(step.yearRange);
      if (!sameJson(next, lastSent.yearRange)) {
        post({ type: 'bigfoot:setYearRange', ...next });
        lastSent.yearRange = next;
      }
    }
    if (step.highlight !== undefined) {
      const next = plain(step.highlight) ?? { flight: null, trip: null };
      if (!sameJson(next, lastSent.highlight)) {
        post({ type: 'bigfoot:setHighlight', ...next });
        lastSent.highlight = next;
      }
    }
    if (step.view) {
      const v = plain(step.view);
      const destination = {
        type: 'bigfoot:setView',
        center: v.center,
        zoom: v.zoom,
        duration: v.duration ?? 1600,
      };
      const fromCenter = v.flyFrom ?? (v.flyFromHome ? plain(home) : null);
      if (fromCenter) {
        const hopMs = v.homeDuration ?? 1100;
        post({
          type: 'bigfoot:setView',
          center: fromCenter,
          zoom: v.homeZoom ?? homeZoom,
          duration: hopMs,
        });
        viewTimer = setTimeout(() => {
          post(destination);
          viewTimer = null;
        }, hopMs + 80);
      } else {
        post(destination);
      }
    }
    if (step.animateYears) {
      post({ type: 'bigfoot:animateYears', ...plain(step.animateYears) });
    }
  }

  let prevIndex = -1;
  let viewTimer = null;
  let markersTimer = null;
  let showMarkers = $state(false);

  $effect(() => {
    if (!ready) return;
    if (viewTimer) {
      clearTimeout(viewTimer);
      viewTimer = null;
    }
    if (markersTimer) {
      clearTimeout(markersTimer);
      markersTimer = null;
    }
    showMarkers = false;
    if (prevIndex !== -1 && steps[prevIndex]?.animateYears) {
      post({ type: 'bigfoot:stopAnimation' });
    }
    applyStep(activeIndex);
    prevIndex = activeIndex;

    const step = steps[activeIndex];
    if (step?.markers || step?.heartOverlay) {
      const v = step.view || {};
      const hop = (v.flyFrom || v.flyFromHome) ? (v.homeDuration ?? 1100) + 80 : 0;
      const dest = v.duration ?? (step.view ? 1600 : 0);
      const delay = Math.max(0, hop + Math.round(dest * 0.6) - 150);
      markersTimer = setTimeout(() => {
        showMarkers = true;
        markersTimer = null;
      }, delay);
    }
  });

  const isLastStep = $derived(activeIndex === steps.length - 1);

  $effect(() => {
    if (!isLastStep) hintDismissed = false;
  });

  onMount(() => {
    const categoryEl = rootEl.closest('[data-post-category]');
    const category = categoryEl?.dataset.postCategory;
    backHref = resolveBack(category ? `/${category}` : '/');

    try {
      const u = new URL(src, window.location.href);
      iframeOrigin = u.origin;
      u.searchParams.set('parent', window.location.origin);
      iframeSrc = u.toString();
    } catch {
      iframeSrc = src;
    }

    function onMessage(e) {
      if (iframeOrigin && e.origin !== iframeOrigin) return;
      if (e.source !== iframeEl?.contentWindow) return;
      if (e.data?.type === 'bigfoot:ready') {
        ready = true;
        post({ type: 'bigfoot:setTheme', theme: currentTheme() });
        applyStep(activeIndex);
      }
    }
    window.addEventListener('message', onMessage);

    const themeObserver = new MutationObserver(() => {
      if (ready) post({ type: 'bigfoot:setTheme', theme: currentTheme() });
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    function onWindowBlur() {
      if (isLastStep && document.activeElement === iframeEl) {
        hintDismissed = true;
      }
    }
    window.addEventListener('blur', onWindowBlur);

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

    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('blur', onWindowBlur);
      stepObserver.disconnect();
      rootObserver.disconnect();
      themeObserver.disconnect();
    };
  });
</script>

<div class="scrollytelling" bind:this={rootEl}>
  <a class="back-link" class:hidden={!inView} href={backHref} onclick={handleBack}>&lt;&lt; go back</a>

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
      {#if title}
        <div class="title-overlay">
          <h1>{title}</h1>
        </div>
      {/if}
      {#if iframeSrc}
        <iframe
          bind:this={iframeEl}
          src={iframeSrc}
          title="bigfoot map"
          class:interactive={isLastStep}
          loading="eager"
        ></iframe>
      {/if}
      {#if isLastStep && !hintDismissed}
        <button
          type="button"
          class="play-hint"
          onclick={() => (hintDismissed = true)}
        >play with it ↓</button>
      {/if}
      {#if steps[activeIndex]?.heartOverlay && showMarkers}
        <div class="heart-overlay" aria-hidden="true">❤️</div>
      {/if}
      {#if steps[activeIndex]?.markers && showMarkers}
        {#each steps[activeIndex].markers as m, mi (mi)}
          <div
            class="map-marker"
            style="left: {m.x}; top: {m.y};{m.size ? ` font-size: ${m.size};` : ''}"
            aria-hidden="true"
          >{m.emoji}</div>
        {/each}
      {/if}
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

  .title-overlay {
    position: absolute;
    bottom: 1.25rem;
    left: 1.25rem;
    z-index: 5;
    pointer-events: none;
  }

  .title-overlay h1 {
    display: inline-block;
    color: var(--accent-color);
    background: var(--bg-color);
    font-size: 1.6rem;
    line-height: 1.1;
    padding: 6px 14px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    transform: rotate(-0.6deg);
  }

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
    pointer-events: none;
    transition: filter 0.4s ease;
  }

  iframe.interactive {
    pointer-events: auto;
  }

  .play-hint {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 7;
    background: var(--bg-color);
    color: var(--accent-color);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    padding: 14px 24px;
    font: inherit;
    font-size: 1.4rem;
    cursor: pointer;
    box-shadow: 4px 6px 18px rgba(0, 0, 0, 0.22);
    animation: play-bob 2.4s ease-in-out infinite;
  }

  .play-hint:hover {
    background: var(--accent-color);
    color: var(--bg-color);
  }

  @keyframes play-bob {
    0%, 100% { transform: translate(-50%, -50%) rotate(-0.6deg) scale(1); }
    50% { transform: translate(-50%, -55%) rotate(-0.6deg) scale(1.04); }
  }

  .heart-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 4rem;
    z-index: 6;
    pointer-events: none;
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
    animation: heart-pulse 1.6s ease-in-out infinite;
  }

  @keyframes heart-pulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.15); }
  }

  .map-marker {
    position: absolute;
    transform: translate(-50%, -50%);
    font-size: 2rem;
    z-index: 6;
    pointer-events: none;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    animation: marker-bob 2.4s ease-in-out infinite;
  }

  .map-marker:nth-child(2) { animation-delay: 0.3s; }
  .map-marker:nth-child(3) { animation-delay: 0.6s; }
  .map-marker:nth-child(4) { animation-delay: 0.9s; }
  .map-marker:nth-child(5) { animation-delay: 1.2s; }

  @keyframes marker-bob {
    0%, 100% { transform: translate(-50%, -50%) translateY(0) scale(1); }
    50% { transform: translate(-50%, -50%) translateY(-6px) scale(1.08); }
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
    transition:
      transform 0.5s ease,
      opacity 0.5s ease,
      box-shadow 0.5s ease;
    opacity: 0.35;
    max-width: 460px;
  }

  .step:nth-child(even) .bubble {
    transform: rotate(0.5deg);
  }

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

  .bubble p :global(em) {
    font-style: italic;
  }

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
    .grid {
      grid-template-columns: 1fr;
    }

    .visual-side {
      height: 65vh;
      position: sticky;
      top: 0;
    }

    .story-side {
      padding: 0 1.25rem;
    }

    .step {
      min-height: 65vh;
    }

    .title-overlay h1 {
      font-size: 1.4rem;
    }

    .bubble {
      max-width: 100%;
    }

    .progress-bar {
      height: 30vh;
    }
  }
</style>
