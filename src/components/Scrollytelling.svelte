<script>
  import { onMount } from 'svelte';

  let { title = '', steps = [] } = $props();

  let activeIndex = $state(0);
  let inView = $state(true);
  let rootEl;
  let storyEl;
  let backHref = $state('/');

  const groups = $derived.by(() => {
    const result = [];
    let flatIdx = 0;
    steps.forEach((step, gIdx) => {
      const imgs = step.images && step.images.length ? step.images : [step.image];
      const units = imgs.map((img) => ({ image: img, flatIndex: flatIdx++ }));
      result.push({
        groupIndex: gIdx,
        caption: step.caption,
        units,
        isGroup: imgs.length > 1,
      });
    });
    return result;
  });

  const units = $derived(groups.flatMap((g) => g.units.map((u) => ({ ...u, caption: g.caption }))));
  const activeGroup = $derived(
    groups.find((g) => g.units.some((u) => u.flatIndex === activeIndex))?.groupIndex ?? 0
  );

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

  function resolve(src) {
    if (src.startsWith('http') || src.startsWith(base)) return src;
    const normalized = src.startsWith('/') ? src.slice(1) : src;
    const baseWithSlash = base.endsWith('/') ? base : base + '/';
    return baseWithSlash + normalized;
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
    s = s.replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,!?;:])/g, '$1<em>$2</em>');
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
      {
        rootMargin: '-45% 0px -45% 0px',
        threshold: 0,
      }
    );

    const sections = storyEl.querySelectorAll('.step');
    sections.forEach((s) => stepObserver.observe(s));

    const rootObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
      },
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
    {String(activeGroup + 1).padStart(2, '0')} / {String(groups.length).padStart(2, '0')}
  </div>

  <div class="progress-bar" class:hidden={!inView}>
    <div
      class="progress-bar-fill"
      style="height: {((activeGroup + 1) / groups.length) * 100}%"
    ></div>
  </div>

  <div class="grid">
    <div class="visual-side">
      {#if title}
        <div class="title-overlay">
          <h1>{title}</h1>
        </div>
      {/if}
      <div class="image-stack">
        {#each units as unit, i}
          <img
            src={resolve(unit.image)}
            alt={stripMd(unit.caption)}
            class:active={i === activeIndex}
            loading={i < 2 ? 'eager' : 'lazy'}
          />
        {/each}
      </div>
    </div>

    <div class="story-side" bind:this={storyEl}>
      {#each groups as group}
        {#if group.isGroup}
          <div class="step-group">
            <div class="sticky-bubble-wrap">
              <div class="bubble" class:active={group.units.some((u) => u.flatIndex === activeIndex)}>
                <span class="step-num">{String(group.groupIndex + 1).padStart(2, '0')}</span>
                <p>{@html mdInline(group.caption)}</p>
              </div>
            </div>
            {#each group.units as unit}
              <section class="step short" data-index={unit.flatIndex} class:active={unit.flatIndex === activeIndex}></section>
            {/each}
          </div>
        {:else}
          {@const unit = group.units[0]}
          <section class="step" data-index={unit.flatIndex} class:active={unit.flatIndex === activeIndex}>
            <div class="bubble">
              <span class="step-num">{String(group.groupIndex + 1).padStart(2, '0')}</span>
              <p>{@html mdInline(group.caption)}</p>
            </div>
          </section>
        {/if}
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
    top: 1rem;
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

  .image-stack {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .image-stack img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.7s ease;
  }

  .image-stack img.active {
    opacity: 1;
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

  .step.short {
    min-height: 45vh;
    padding: 0;
  }

  .step-group {
    position: relative;
  }

  .sticky-bubble-wrap {
    position: sticky;
    top: 0;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    pointer-events: none;
    margin-bottom: -100vh;
  }

  .sticky-bubble-wrap .bubble {
    pointer-events: auto;
    opacity: 0;
  }

  .sticky-bubble-wrap .bubble.active {
    opacity: 1;
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

  .step.active .bubble,
  .bubble.active {
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
