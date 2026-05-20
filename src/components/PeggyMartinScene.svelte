<script>
  import { onMount } from 'svelte';

  let { video = '', alt = '', story = '', reflection = '', caption = '', title = '' } = $props();

  const base = import.meta.env.BASE_URL || '';
  const fullSrc =
    video.startsWith('http') || video.startsWith(base) ? video : `${base}${video}`;

  let backHref = $state('/');

  function resolveBack(path) {
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    const baseWithSlash = base.endsWith('/') ? base : base + '/';
    return baseWithSlash + normalized;
  }

  function handleBack(e) {
    if (window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
  }

  onMount(() => {
    backHref = resolveBack('/posts/');
  });

  function mdInline(text) {
    if (!text) return '';
    let s = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return s;
  }
</script>

<section class="peggy-scene">
  <a class="back-link" href={backHref} onclick={handleBack}>&lt;&lt; go back</a>

  {#if title}
    <div class="title-chip">
      <h1>{title}</h1>
    </div>
  {/if}

  <div class="bubble bubble-story">
    <p>{@html mdInline(story)}</p>
  </div>

  <figure class="gif-frame">
    <video
      src={fullSrc}
      autoplay
      loop
      muted
      playsinline
      preload="auto"
      aria-label={alt}
    ></video>
    {#if caption}
      <figcaption>{@html mdInline(caption)}</figcaption>
    {/if}
  </figure>

  <div class="bubble bubble-reflection">
    <p>{@html mdInline(reflection)}</p>
  </div>
</section>

<style>
  .peggy-scene {
    position: relative;
    width: 100%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    box-sizing: border-box;
    overflow: hidden;
  }

  .gif-frame {
    margin: 0;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 2px;
    padding: 14px 14px 3rem 14px;
    background: #fff;
    box-shadow:
      3px 6px 18px rgba(0, 0, 0, 0.22),
      0 1px 0 rgba(255, 255, 255, 0.4) inset;
    transform: rotate(-1.6deg);
    max-width: min(52vw, 60vh);
  }

  .gif-frame video {
    display: block;
    width: 100%;
    height: auto;
    max-height: 62vh;
    border-radius: 0;
  }

  .gif-frame figcaption {
    margin-top: 1rem;
    font-size: 1rem;
    color: #2a2a2a;
    text-align: center;
    font-style: italic;
    opacity: 0.9;
    line-height: 1.3;
  }

  .bubble {
    position: absolute;
    background: var(--bg-color);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 1.1rem 1.4rem;
    box-shadow: 4px 6px 18px rgba(0, 0, 0, 0.18);
    max-width: 380px;
    font-size: 1.3rem;
    line-height: 1.5;
    color: var(--text-color);
    z-index: 2;
  }

  .bubble p {
    margin: 0;
  }

  .bubble :global(strong) {
    color: var(--accent-color);
    font-weight: bold;
  }

  .bubble :global(em) {
    font-style: italic;
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

  .title-chip {
    position: absolute;
    top: 6vh;
    right: 5vw;
    z-index: 3;
    pointer-events: none;
  }

  .title-chip h1 {
    margin: 0;
    display: inline-block;
    color: var(--accent-color);
    background: var(--bg-color);
    font-size: 1.9rem;
    line-height: 1.1;
    padding: 8px 16px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    transform: rotate(1.4deg);
    box-shadow: 2px 4px 12px rgba(0, 0, 0, 0.14);
  }

  .bubble-story {
    top: 8vh;
    left: 5vw;
    transform: rotate(-1.2deg);
  }

  .bubble-reflection {
    bottom: 8vh;
    right: 5vw;
    transform: rotate(0.9deg);
    max-width: 360px;
  }

  @media (max-width: 780px) {
    .peggy-scene {
      padding: 1rem;
    }
    .title-chip {
      top: 2vh;
      right: 4vw;
    }
    .title-chip h1 {
      font-size: 1.4rem;
      padding: 6px 12px;
    }
    .gif-frame {
      max-width: 88vw;
    }
    .bubble {
      max-width: 78vw;
      font-size: 1.1rem;
      padding: 0.9rem 1.1rem;
    }
    .bubble-story {
      top: 3vh;
      left: 4vw;
    }
    .bubble-reflection {
      bottom: 3vh;
      right: 4vw;
    }
  }
</style>
