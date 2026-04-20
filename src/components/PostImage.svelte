<script>
  let { src = '', alt = '', caption = '' } = $props();
  const base = import.meta.env.BASE_URL || '';
  const fullSrc = src.startsWith('http') || src.startsWith(base) ? src : `${base}${src}`;
</script>

<figure class="post-image">
  <div class="post-image-frame">
    <img src={fullSrc} {alt} loading="lazy" />
  </div>
  {#if caption}
    <figcaption>{caption}</figcaption>
  {/if}
</figure>

<style>
  .post-image {
    margin: 1.5rem 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .post-image-frame {
    border: 2px solid var(--border-color, rgba(249, 155, 68, 0.3));
    border-radius: 4px;
    padding: 6px;
    background: var(--bg-color, white);
    transform: rotate(-0.8deg);
    transition: transform 0.3s ease;
    box-shadow: 2px 3px 8px rgba(0, 0, 0, 0.08);
    max-width: 100%;
  }

  .post-image-frame:hover {
    transform: rotate(0deg) scale(1.01);
  }

  img {
    display: block;
    max-width: 100%;
    height: auto;
    border-radius: 2px;
  }

  figcaption {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-secondary, #333);
    text-align: center;
    font-style: italic;
    transform: rotate(0.5deg);
  }
</style>
