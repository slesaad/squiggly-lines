<script>
  let {
    title = '',
    description = '',
    kicker = '',
    image = null,
    imageAlt = '',
  } = $props();

  const base = import.meta.env.BASE_URL || '';

  function resolve(src) {
    if (!src) return '';
    if (src.startsWith('http') || src.startsWith(base)) return src;
    const normalized = src.startsWith('/') ? src.slice(1) : src;
    const baseWithSlash = base.endsWith('/') ? base : base + '/';
    return baseWithSlash + normalized;
  }
</script>

<section class="post-header" class:has-image={!!image}>
  {#if image}
    <div class="header-image">
      <img src={resolve(image)} alt={imageAlt || title} />
    </div>
  {/if}

  <div class="header-text">
    {#if kicker}
      <span class="header-kicker">{kicker}</span>
    {/if}
    <h1>{title}</h1>
    {#if description}
      <p class="header-description">{description}</p>
    {/if}
    <div class="scroll-hint" aria-hidden="true">
      <span>scroll</span>
      <span class="arrow">↓</span>
    </div>
  </div>
</section>

<style>
  .post-header {
    height: 100vh;
    max-height: 100vh;
    display: flex;
    align-items: stretch;
    background: var(--bg-color);
    font-family: 'Schoolbell', cursive;
    overflow: hidden;
  }

  .post-header:not(.has-image) {
    justify-content: center;
    align-items: center;
    padding: 3rem 2rem;
  }

  .header-image {
    position: relative;
    flex: 1 1 55%;
    overflow: hidden;
    height: 100%;
    max-height: 100vh;
    border-right: 2px solid var(--border-color);
  }

  .header-image::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.25) 0%,
      rgba(0, 0, 0, 0.50) 50%,
      rgba(0, 0, 0, 0.75) 100%
    );
    pointer-events: none;
  }

  .header-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .header-text {
    flex: 1 1 45%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4rem 3rem;
    max-width: 640px;
    position: relative;
  }

  .post-header:not(.has-image) .header-text {
    text-align: center;
    align-items: center;
    max-width: 720px;
  }

  .header-kicker {
    display: inline-block;
    font-size: 0.95rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }

  .header-text h1 {
    font-size: 3.2rem;
    line-height: 1.05;
    color: var(--accent-color);
    margin-bottom: 1.5rem;
    transform: rotate(-0.6deg);
  }

  .header-description {
    font-size: 1.35rem;
    line-height: 1.5;
    color: var(--text-color);
    margin-bottom: 2rem;
  }

  .scroll-hint {
    position: absolute;
    bottom: 2rem;
    left: 3rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: 1rem;
  }

  .post-header:not(.has-image) .scroll-hint {
    left: 50%;
    transform: translateX(-50%);
  }

  .scroll-hint .arrow {
    display: inline-block;
    animation: bounce 1.8s ease-in-out infinite;
    color: var(--accent-color);
    font-size: 1.3rem;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(6px); }
  }

  @media (max-width: 780px) {
    .post-header {
      flex-direction: column;
    }

    .header-image {
      flex: none;
      min-height: 45vh;
      max-height: 55vh;
      border-right: none;
      border-bottom: 2px solid var(--border-color);
    }

    .header-text {
      flex: none;
      padding: 2.5rem 1.5rem 4rem;
      max-width: 100%;
    }

    .header-text h1 {
      font-size: 2.2rem;
    }

    .header-description {
      font-size: 1.1rem;
    }

    .scroll-hint {
      justify-content: center;
    }
  }
</style>
