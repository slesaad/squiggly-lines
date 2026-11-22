<script lang="ts">
  // A small gallery wall beside the fridge: a vintage-style park poster, a
  // squiggly-line print, and a pressed fern. All original illustrations.
  let { width }: { width: number } = $props();
</script>

<div class="gallery" style={`width:${width}px`} aria-hidden="true">
  <!-- Park poster in a wood frame with a cream mat -->
  <figure class="frame wood" style="--tilt: -1.2deg">
    <svg viewBox="0 0 300 400" class="art">
      <defs>
        <linearGradient id="wa-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f6d48b" />
          <stop offset="0.55" stop-color="#f29a6a" />
          <stop offset="1" stop-color="#c7708a" />
        </linearGradient>
      </defs>
      <rect width="300" height="400" fill="url(#wa-sky)" />
      <circle cx="196" cy="128" r="44" fill="#fff0c9" />
      <path d="M0 210 L60 150 L105 190 L160 120 L215 185 L255 150 L300 195 V400 H0 Z" fill="#b8697f" />
      <path d="M0 240 L45 205 L95 238 L150 185 L205 236 L250 205 L300 230 V400 H0 Z" fill="#7a5180" />
      <path d="M0 262 H300 V300 H0 Z" fill="#87c0c4" />
      <path d="M40 274 H110 M150 282 H250 M70 292 H140" stroke="#d9f0f0" stroke-width="3" stroke-linecap="round" />
      <path d="M0 300 L30 286 L70 296 L120 282 L170 298 L230 284 L300 296 V400 H0 Z" fill="#2f5a4f" />
      <g fill="#1f3f37">
        <path d="M30 330 L44 280 L58 330 Z" />
        <path d="M48 336 L64 270 L80 336 Z" />
        <path d="M232 332 L248 268 L264 332 Z" />
        <path d="M256 336 L270 286 L284 336 Z" />
      </g>
      <rect y="336" width="300" height="64" fill="#1f3f37" />
      <text x="150" y="370" text-anchor="middle" class="poster-title">THE GREAT OUTDOORS</text>
      <text x="150" y="390" text-anchor="middle" class="poster-sub">63 NATIONAL PARKS</text>
    </svg>
  </figure>

  <div class="stack">
    <!-- Squiggly lines print in a thin black frame -->
    <figure class="frame black" style="--tilt: 1.5deg">
      <svg viewBox="0 0 120 120" class="art">
        <rect width="120" height="120" fill="#fbf6ea" />
        <path d="M14 40 q12 -14 24 0 t24 0 t24 0 t24 0" stroke="#f7b27a" stroke-width="6" fill="none" stroke-linecap="round" />
        <path d="M14 62 q12 -14 24 0 t24 0 t24 0 t24 0" stroke="#9fcf86" stroke-width="6" fill="none" stroke-linecap="round" />
        <path d="M14 84 q12 -14 24 0 t24 0 t24 0 t24 0" stroke="#55c2b5" stroke-width="6" fill="none" stroke-linecap="round" />
      </svg>
    </figure>

    <!-- Pressed fern in a white frame -->
    <figure class="frame white tall" style="--tilt: -0.8deg">
      <svg viewBox="0 0 100 140" class="art">
        <rect width="100" height="140" fill="#f4efe3" />
        <path d="M50 128 C 50 95, 52 60, 56 18" stroke="#4f7a3c" stroke-width="2.5" fill="none" stroke-linecap="round" />
        {#each Array.from({ length: 9 }, (_, i) => i) as i}
          {@const y = 112 - i * 10.5}
          {@const len = 26 - i * 2.2}
          <path d={`M${50 + i * 0.6} ${y} q ${-len * 0.6} -4 ${-len} -12`} stroke="#5f8f45" stroke-width="5" fill="none" stroke-linecap="round" />
          <path d={`M${50 + i * 0.6} ${y} q ${len * 0.6} -4 ${len} -12`} stroke="#6c9c50" stroke-width="5" fill="none" stroke-linecap="round" />
        {/each}
      </svg>
    </figure>
  </div>
</div>

<style>
  .gallery {
    display: flex;
    align-items: flex-start;
    gap: 7%;
  }
  .stack {
    flex: 0 0 34%;
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding-top: 6%;
  }

  .frame {
    position: relative;
    margin: 0;
    rotate: var(--tilt);
    box-shadow:
      0 2px 3px rgba(0, 0, 0, 0.2),
      6px 12px 18px -6px rgba(0, 0, 0, 0.35);
  }
  /* A nail and its little shadow above each frame. */
  .frame::before {
    content: '';
    position: absolute;
    top: -14px;
    left: 50%;
    width: 5px;
    height: 5px;
    translate: -50% 0;
    border-radius: 50%;
    background: #8a8f94;
    box-shadow: 1px 2px 2px rgba(0, 0, 0, 0.3);
  }
  .art {
    display: block;
    width: 100%;
    height: auto;
  }
  .wood {
    flex: 1;
    padding: 9%;
    background: #fbf6ea;
    border: 10px solid #7a5534;
    border-image: linear-gradient(135deg, #8d6440, #5e3f25 60%, #7a5534) 1;
  }
  .black {
    padding: 10%;
    background: #fffdf8;
    border: 4px solid #1f1f22;
  }
  .white {
    padding: 9%;
    background: #fffdf8;
    border: 6px solid #f4f1ea;
    outline: 1px solid rgba(0, 0, 0, 0.08);
  }

  .poster-title {
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-size: 27px;
    letter-spacing: 0.08em;
    fill: #fbe9c7;
  }
  .poster-sub {
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-size: 12px;
    letter-spacing: 0.35em;
    fill: #f29a6a;
  }

  /* Night kitchen: the art sits in the same low light as the wall. */
  :global([data-theme='dark']) .gallery {
    filter: brightness(0.72) saturate(0.85);
  }
</style>
