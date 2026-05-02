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

    return () => {
      stepObserver.disconnect();
      rootObserver.disconnect();
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
      <div class="panel" class:visible={activePanel === 'photo'}>
        <!-- Photo stage filled in Task 5 -->
        <div class="placeholder">PHOTO STAGE</div>
      </div>
      <div class="panel" class:visible={activePanel === 'map'}>
        <!-- World map filled in Task 8 -->
        <div class="placeholder">WORLD MAP</div>
      </div>
      <div class="panel" class:visible={activePanel === 'ending'}>
        <!-- Party card filled in Task 11 -->
        <div class="placeholder">PARTY CARD</div>
      </div>
      <div class="panel" class:visible={activePanel === 'outtakes'}>
        <!-- Outtakes reel filled in Task 11 -->
        <div class="placeholder">OUTTAKES REEL</div>
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
</style>
