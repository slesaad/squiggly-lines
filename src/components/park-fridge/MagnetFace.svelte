<script lang="ts">
  import type { Park } from '../../data/parks';
  import { resolveAsset } from './format';
  import { magnetImageFor } from './magnet-image';

  // The cut-out photo of a park's magnet, drawn with molded thickness:
  // darkened copies stacked below and to the right, so the edge follows the
  // magnet's own outline, and a sheen masked to the silhouette that lights the
  // upper left and shades the lower right.
  let { park }: { park: Park } = $props();

  const src = $derived(resolveAsset(magnetImageFor(park).src));
</script>

<span class="photo" style={`--src: url("${src}")`}>
  <img class="edge" style="translate: 1.1% 6%; filter: brightness(0.32) saturate(0.7)" {src} alt="" draggable="false" />
  <img class="edge" style="translate: 0.7% 4%; filter: brightness(0.48) saturate(0.8)" {src} alt="" draggable="false" />
  <img class="edge" style="translate: 0.35% 2%; filter: brightness(0.55) saturate(0.85)" {src} alt="" draggable="false" />
  <img class="top" {src} alt="" draggable="false" />
  <span class="sheen"></span>
</span>

<style>
  .photo {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
  }
  img,
  .sheen {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  img {
    object-fit: contain;
  }
  /* Printed faces read a touch punchier against the glossy enamel. */
  .top {
    filter: contrast(1.08) saturate(1.1) brightness(1.03);
  }
  .sheen {
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.3),
      rgba(255, 255, 255, 0) 40%,
      rgba(0, 0, 0, 0) 75%,
      rgba(0, 0, 0, 0.07)
    );
    -webkit-mask: var(--src) center / contain no-repeat;
    mask: var(--src) center / contain no-repeat;
    pointer-events: none;
  }
</style>
