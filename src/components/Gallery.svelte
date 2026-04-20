<script>
  let {
    heading = '',
    kicker = '',
    images = [],
    columns = 2,
  } = $props();

  const base = import.meta.env.BASE_URL || '';

  function resolve(src) {
    if (src.startsWith('http') || src.startsWith(base)) return src;
    const normalized = src.startsWith('/') ? src.slice(1) : src;
    const baseWithSlash = base.endsWith('/') ? base : base + '/';
    return baseWithSlash + normalized;
  }
</script>

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
    {#each images as img}
      <figure class="gallery-item" class:has-caption={!!img.caption}>
        <img src={resolve(img.image)} alt={img.caption ?? ''} loading="lazy" />
        {#if img.caption}
          <figcaption>{img.caption}</figcaption>
        {/if}
      </figure>
    {/each}
  </div>
</section>

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
    column-count: var(--cols, 2);
    column-gap: 2rem;
    max-width: 820px;
    margin: 0 auto;
  }

  .gallery-item {
    break-inside: avoid;
    margin: 0 0 2rem;
    padding: 12px 12px 14px;
    background: #fdfdfb;
    box-shadow: 3px 5px 14px rgba(0, 0, 0, 0.18);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .gallery-item.has-caption {
    padding-bottom: 1.25rem;
  }

  .gallery-item:nth-child(3n + 1) {
    transform: rotate(-1.2deg);
  }

  .gallery-item:nth-child(3n + 2) {
    transform: rotate(0.9deg);
  }

  .gallery-item:nth-child(3n) {
    transform: rotate(-0.3deg);
  }

  .gallery-item:hover {
    transform: rotate(0deg) scale(1.02);
    box-shadow: 5px 8px 20px rgba(0, 0, 0, 0.25);
    z-index: 2;
  }

  .gallery-item img {
    display: block;
    width: 100%;
    height: auto;
  }

  .gallery-item figcaption {
    margin-top: 0.75rem;
    padding: 0 0.25rem;
    text-align: center;
    color: #222;
    font-size: 1.05rem;
    line-height: 1.25;
  }

  @media (max-width: 780px) {
    .gallery-section {
      padding: 3rem 1.25rem 4rem;
    }

    .gallery {
      column-count: 1;
    }

    .gallery-heading h2 {
      font-size: 1.6rem;
    }
  }
</style>
