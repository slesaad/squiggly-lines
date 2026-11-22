<script lang="ts">
  import type { Park, Visit } from '../../data/parks';
  import { formatMonth, resolveAsset } from './format';

  // A Polaroid held to the card by a small round magnet.
  let { park, visit, tilt = 0 }: { park: Park; visit: Visit; tilt?: number } = $props();

  const caption = $derived(visit.photo?.caption ?? formatMonth(visit.date));
  const alt = $derived(caption || `${park.name} National Park`);
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>

<figure class="polaroid" style={`--tilt:${tilt}deg`}>
  <span class="pin" aria-hidden="true"></span>
  <div class="photo">
    {#if visit.photo?.video}
      <!-- Loops silently like a live photo; with reduced motion it waits for a tap on its controls. -->
      <video
        src={resolveAsset(visit.photo.video)}
        poster={resolveAsset(visit.photo.url)}
        aria-label={alt}
        muted
        loop
        playsinline
        autoplay={!reducedMotion}
        controls={reducedMotion}
        preload="metadata"
      ></video>
    {:else if visit.photo}
      <img src={resolveAsset(visit.photo.url)} {alt} loading="lazy" />
    {/if}
  </div>
  {#if caption}
    <figcaption>{caption}</figcaption>
  {/if}
</figure>

<style>
  .polaroid {
    position: relative;
    margin: 0;
    width: 100%;
    padding: 5% 5% 0;
    background: #fff;
    rotate: var(--tilt);
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.15),
      0 10px 22px -8px rgba(0, 0, 0, 0.35);
  }
  .photo {
    aspect-ratio: 1;
    overflow: hidden;
    background: #ddd;
  }
  .photo img,
  .photo video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  figcaption {
    font-family: 'Mansalva', cursive;
    font-size: clamp(17px, 2.2vw, 22px);
    color: #3a3a3a;
    text-align: center;
    padding: 0.5em 0 0.7em;
    line-height: 1.2;
  }
  .polaroid:not(:has(figcaption)) {
    padding-bottom: 14%;
  }
  .pin {
    position: absolute;
    top: -9px;
    left: 50%;
    width: 22px;
    height: 22px;
    translate: -50% 0;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.75), transparent 45%), #c8302c;
    box-shadow:
      0 2px 3px rgba(0, 0, 0, 0.35),
      inset 0 -2px 3px rgba(0, 0, 0, 0.25);
    z-index: 1;
  }
</style>
