<script>
  import { onMount } from 'svelte';

  let { url = '', tilt = -1.4 } = $props();

  const canonical = $derived(url.split('?')[0].replace(/\/?$/, '/'));

  function ensureEmbedScript() {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve();
      if (window.instgrm?.Embeds) return resolve();

      const existing = document.querySelector('script[data-instgrm-embed]');
      if (existing) {
        const check = setInterval(() => {
          if (window.instgrm?.Embeds) {
            clearInterval(check);
            resolve();
          }
        }, 50);
        return;
      }

      const s = document.createElement('script');
      s.src = 'https://www.instagram.com/embed.js';
      s.async = true;
      s.setAttribute('data-instgrm-embed', 'true');
      s.onload = () => resolve();
      document.body.appendChild(s);
    });
  }

  onMount(async () => {
    await ensureEmbedScript();
    window.instgrm?.Embeds?.process();
  });
</script>

<figure class="polaroid" style="--tilt: {tilt}deg">
  <blockquote
    class="instagram-media"
    data-instgrm-captioned
    data-instgrm-permalink={canonical}
    data-instgrm-version="14"
  >
  </blockquote>
</figure>

<style>
  .polaroid {
    margin: 0 auto;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 2px;
    padding: 14px 14px 3rem 14px;
    background: #fff;
    box-shadow:
      3px 6px 18px rgba(0, 0, 0, 0.22),
      0 1px 0 rgba(255, 255, 255, 0.4) inset;
    transform: rotate(var(--tilt, -1.4deg));
    width: fit-content;
    max-width: 100%;
  }

  blockquote {
    background: #fff;
    border: 0;
    margin: 0;
    max-width: 540px;
    min-width: 326px;
    padding: 0;
    width: 100%;
    box-shadow: none;
  }
</style>
