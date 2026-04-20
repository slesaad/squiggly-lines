<script>
  let {
    heading = '',
    kicker = '',
    images = [],
    columns = 3,
  } = $props();

  let activeIdx = $state(-1);

  const base = import.meta.env.BASE_URL || '';

  function resolve(src) {
    if (src.startsWith('http') || src.startsWith(base)) return src;
    const normalized = src.startsWith('/') ? src.slice(1) : src;
    const baseWithSlash = base.endsWith('/') ? base : base + '/';
    return baseWithSlash + normalized;
  }

  function open(i) {
    activeIdx = i;
  }

  function close() {
    activeIdx = -1;
  }

  function prev(e) {
    e?.stopPropagation();
    activeIdx = (activeIdx - 1 + images.length) % images.length;
  }

  function next(e) {
    e?.stopPropagation();
    activeIdx = (activeIdx + 1) % images.length;
  }

  function onKey(e) {
    if (activeIdx < 0) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
  }
</script>

<svelte:window onkeydown={onKey} />

<section class="gallery-section">
  {#if heading || kicker}
    <div class="gallery-heading">
      {#if kicker}
        <span class="gallery-kicker">{kicker}</span>
      {/if}
      {#if heading}
        <h2>{heading}</h2>
      {/if}
    </div>
  {/if}

  <div class="gallery" style="--cols: {columns}">
    {#each images as img, i}
      <button
        type="button"
        class="gallery-item"
        class:has-caption={!!img.caption}
        onclick={() => open(i)}
        aria-label={img.caption || `Open image ${i + 1}`}
      >
        <span class="frame">
          <img src={resolve(img.image)} alt={img.caption ?? ''} loading="lazy" />
        </span>
        {#if img.caption}
          <span class="caption">{img.caption}</span>
        {/if}
      </button>
    {/each}
  </div>
</section>

{#if activeIdx >= 0}
  <div
    class="lightbox"
    onclick={(e) => e.target === e.currentTarget && close()}
    role="dialog"
    aria-modal="true"
    aria-label="Image viewer"
  >
    <button class="lightbox-close" onclick={close} aria-label="Close">×</button>

    {#if images.length > 1}
      <button class="lightbox-nav prev" onclick={prev} aria-label="Previous">‹</button>
      <button class="lightbox-nav next" onclick={next} aria-label="Next">›</button>
    {/if}

    <figure class="lightbox-content">
      <img
        src={resolve(images[activeIdx].image)}
        alt={images[activeIdx].caption ?? ''}
      />
      {#if images[activeIdx].caption}
        <figcaption>{images[activeIdx].caption}</figcaption>
      {/if}
    </figure>

    {#if images.length > 1}
      <div class="lightbox-counter">
        {activeIdx + 1} / {images.length}
      </div>
    {/if}
  </div>
{/if}

<style>
  .gallery-section {
    padding: 5rem 3rem 6rem;
    background: var(--bg-color);
    border-top: 2px dashed var(--border-color);
    font-family: 'Schoolbell', cursive;
  }

  .gallery-heading {
    text-align: center;
    margin-bottom: 3rem;
  }

  .gallery-kicker {
    display: inline-block;
    font-size: 0.9rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }

  .gallery-heading h2 {
    color: var(--accent-color);
    font-size: 2.2rem;
    transform: rotate(-0.6deg);
  }

  .gallery {
    display: grid;
    grid-template-columns: repeat(var(--cols, 3), 1fr);
    gap: 2rem;
    max-width: 1100px;
    margin: 0 auto;
  }

  .gallery-item {
    display: block;
    width: 100%;
    margin: 0;
    padding: 10px 10px 12px;
    background: #fdfdfb;
    border: none;
    box-shadow: 3px 5px 14px rgba(0, 0, 0, 0.18);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    cursor: zoom-in;
    font-family: inherit;
    text-align: center;
  }

  .gallery-item.has-caption {
    padding-bottom: 1.1rem;
  }

  .gallery-item:nth-child(3n + 1) {
    transform: rotate(-1.2deg);
  }

  .gallery-item:nth-child(3n + 2) {
    transform: rotate(0.9deg);
  }

  .gallery-item:nth-child(3n) {
    transform: rotate(1.2deg);
  }

  .gallery-item:hover,
  .gallery-item:focus-visible {
    transform: rotate(0deg) scale(1.03);
    box-shadow: 5px 8px 20px rgba(0, 0, 0, 0.25);
    z-index: 2;
    outline: none;
  }

  .frame {
    display: block;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    background: #eee;
  }

  .frame img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .gallery-item .caption {
    display: block;
    margin-top: 0.6rem;
    padding: 0 0.25rem;
    text-align: center;
    color: #222;
    font-size: 1rem;
    line-height: 1.25;
  }

  /* lightbox */
  .lightbox {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.92);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: zoom-out;
    animation: fade 0.2s ease;
    font-family: 'Schoolbell', cursive;
  }

  @keyframes fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .lightbox-content {
    max-width: 90vw;
    max-height: 90vh;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: default;
  }

  .lightbox-content img {
    max-width: 90vw;
    max-height: 82vh;
    object-fit: contain;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  }

  .lightbox-content figcaption {
    margin-top: 1rem;
    color: #f5f5f5;
    font-size: 1.1rem;
    text-align: center;
    max-width: 70vw;
  }

  .lightbox-close,
  .lightbox-nav {
    position: absolute;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: #fff;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.2s ease, transform 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lightbox-close {
    top: 1rem;
    right: 1rem;
    width: 44px;
    height: 44px;
    font-size: 1.8rem;
    border-radius: 50%;
    line-height: 1;
  }

  .lightbox-nav {
    top: 50%;
    transform: translateY(-50%);
    width: 52px;
    height: 52px;
    font-size: 2.4rem;
    border-radius: 50%;
    line-height: 1;
  }

  .lightbox-nav.prev {
    left: 1.5rem;
  }

  .lightbox-nav.next {
    right: 1.5rem;
  }

  .lightbox-close:hover,
  .lightbox-nav:hover {
    background: rgba(255, 255, 255, 0.22);
  }

  .lightbox-nav.prev:hover {
    transform: translateY(-50%) translateX(-3px);
  }

  .lightbox-nav.next:hover {
    transform: translateY(-50%) translateX(3px);
  }

  .lightbox-counter {
    position: absolute;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.95rem;
    letter-spacing: 0.1em;
    background: rgba(255, 255, 255, 0.08);
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  @media (max-width: 780px) {
    .gallery-section {
      padding: 3rem 1.25rem 4rem;
    }

    .gallery {
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }

    .gallery-heading h2 {
      font-size: 1.6rem;
    }

    .lightbox-nav {
      width: 40px;
      height: 40px;
      font-size: 1.8rem;
    }

    .lightbox-nav.prev {
      left: 0.5rem;
    }

    .lightbox-nav.next {
      right: 0.5rem;
    }
  }
</style>
