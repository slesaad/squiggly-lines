<script lang="ts">
  import { parks, isVisited } from '../../data/parks';
  import {
    MAP_WIDTH,
    MAP_HEIGHT,
    nationPath,
    stateBordersPath,
    insets,
    pinRadii,
    truePositions,
    pinPositions,
  } from '../../data/park-map';

  // A folded paper road map stuck to the fridge door. The visited parks' magnets
  // hold it in place (they are rendered by the door, on top of this); the paper
  // carries the outline, leader lines and empty slots for parks not yet visited.
  //
  // Everything is laid out in door pixels. The camera then scales the door by
  // `cam`, so on-screen sizes (strokes, type) are divided by it here.
  interface Props {
    box: { x: number; y: number; w: number; h: number; k: number }; // k = door px per map unit
    pad: number; // map units of paper around the map
    titleBand: number; // map units above the map for the printed title
    cam: number; // camera scale once zoomed in
    layout: 'wide' | 'compact';
    open: boolean;
    closing: boolean;
    visitedCount: number;
    totalCount: number;
    onclosed?: () => void;
  }

  let { box, pad, titleBand, cam, layout, open, closing, visitedCount, totalCount, onclosed }: Props = $props();

  const emptyParks = parks.filter((p) => !isVisited(p));
  let activeId: string | null = $state(null);
  const activePark = $derived(emptyParks.find((p) => p.id === activeId) ?? null);

  // Screen px per map unit once the camera has arrived: strokes are set in screen px.
  const screenScale = $derived(box.k * cam);
  const px = (n: number) => n / screenScale;

  // Leader lines are only worth drawing when the collision layout moved a pin
  // visibly away from its real location.
  const leaders = $derived(
    parks
      .map((p) => {
        const [tx, ty] = truePositions[p.id];
        const [x, y] = pinPositions[layout][p.id];
        return { id: p.id, visited: isVisited(p), tx, ty, x, y, d: Math.hypot(x - tx, y - ty) };
      })
      .filter((l) => l.d > 4),
  );

  function slotStyle(id: string) {
    const [x, y] = pinPositions[layout][id];
    const size = pinRadii[layout].empty * 2 * box.k;
    return `left:${(pad + x) * box.k}px; top:${(pad + titleBand + y) * box.k}px; --size:${size}px;`;
  }

  $effect(() => {
    if (!open) activeId = null;
  });
</script>

{#snippet sheet(offset: number)}
  <!-- One full sheet of the map; each half of the fold shows its own part of it. -->
  <div class="sheet" style={`width:${box.w}px; height:${box.h}px; top:${-offset}px;`}>
    <div class="title" style={`height:${(pad + titleBand) * box.k}px`}>
      <strong>{visitedCount}</strong> / {totalCount} national parks
    </div>

    <svg
      class="map"
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      style={`left:${pad * box.k}px; top:${(pad + titleBand) * box.k}px; width:${MAP_WIDTH * box.k}px; height:${MAP_HEIGHT * box.k}px;`}
    >
      {#each Object.values(insets) as inset}
        <rect
          class="inset"
          x={inset.x}
          y={inset.y}
          width={inset.width}
          height={inset.height}
          rx="6"
          stroke-width={px(1)}
          stroke-dasharray={`${px(5)} ${px(4)}`}
        />
      {/each}
      <path class="states" d={stateBordersPath} stroke-width={px(0.8)} />
      <path class="nation" d={nationPath} stroke-width={px(1.4)} />
      {#each leaders as l (l.id)}
        <line class="leader" class:visited={l.visited} x1={l.tx} y1={l.ty} x2={l.x} y2={l.y} stroke-width={px(1)} />
        <circle class="true-dot" class:visited={l.visited} cx={l.tx} cy={l.ty} r={px(2.2)} />
      {/each}
    </svg>
  </div>
{/snippet}

<div
  class="paper"
  class:open
  class:closing
  style={`left:${box.x}px; top:${box.y}px; width:${box.w}px; height:${box.h}px; --cam:${cam}; --persp:${box.h * 3}px;`}
  inert={!open}
  aria-hidden={!open}
>
  <!--
    Folded in half across the middle crease: the top half settles onto the door,
    then the bottom half swings down from the crease. Only transforms and
    opacity animate, so the fold stays smooth while the camera moves.
  -->
  <div class="half top" aria-hidden="true">{@render sheet(0)}</div>
  <div class="half bottom" aria-hidden="true" onanimationend={() => closing && onclosed?.()}>
    {@render sheet(box.h / 2)}
  </div>

  <div class="marks">
    {#each emptyParks as park (park.id)}
      <button
        class="empty"
        style={slotStyle(park.id)}
        tabindex="-1"
        aria-label={`${park.name} National Park, not visited yet`}
        onpointerenter={() => (activeId = park.id)}
        onpointerleave={() => activeId === park.id && (activeId = null)}
        onclick={() => (activeId = activeId === park.id ? null : park.id)}
      ></button>
    {/each}

    {#if activePark}
      {@const [x, y] = pinPositions[layout][activePark.id]}
      <div
        class="fridge-tag"
        style={`left:${(pad + x) * box.k}px; top:${(pad + titleBand + y - pinRadii[layout].empty) * box.k}px; translate: -50% calc(-100% - 8px / var(--cam));`}
        role="status"
      >
        {activePark.name}: next up?
      </div>
    {/if}
  </div>
</div>

<style>
  .paper {
    --ink: #2f3a3f;
    --line: rgba(47, 58, 63, 0.62);
    --line-soft: rgba(47, 58, 63, 0.24);
    --slot: rgba(47, 58, 63, 0.5);
    position: absolute;
    color: var(--ink);
    opacity: 0;
    pointer-events: none;
  }
  .paper.open,
  .paper.closing {
    opacity: 1;
    pointer-events: auto;
  }

  .half {
    position: absolute;
    left: 0;
    right: 0;
    height: 50%;
    overflow: hidden;
    box-shadow:
      0 calc(1px / var(--cam)) calc(2px / var(--cam)) rgba(0, 0, 0, 0.16),
      0 calc(6px / var(--cam)) calc(14px / var(--cam)) rgba(0, 0, 0, 0.16);
    /* Kept painted while hidden, so opening the map doesn't start with a big paint. */
    will-change: transform, opacity;
  }
  .half.top {
    top: 0;
    border-radius: calc(2px / var(--cam)) calc(2px / var(--cam)) 0 0;
  }
  .half.bottom {
    top: 50%;
    border-radius: 0 0 calc(2px / var(--cam)) calc(2px / var(--cam));
    transform-origin: 50% 0;
  }
  /*
   * Road-map paper: four panels across, two down, each crease a dark valley
   * beside a light ridge, alternate panels catching slightly less light.
   */
  .sheet {
    position: absolute;
    left: 0;
    background:
      linear-gradient(
        90deg,
        transparent 24.7%,
        rgba(0, 0, 0, 0.07) 25%,
        rgba(255, 255, 255, 0.6) 25.3%,
        transparent 25.8%,
        transparent 49.7%,
        rgba(0, 0, 0, 0.07) 50%,
        rgba(255, 255, 255, 0.6) 50.3%,
        transparent 50.8%,
        transparent 74.7%,
        rgba(0, 0, 0, 0.07) 75%,
        rgba(255, 255, 255, 0.6) 75.3%,
        transparent 75.8%
      ),
      linear-gradient(180deg, transparent 49.6%, rgba(0, 0, 0, 0.06) 50%, rgba(255, 255, 255, 0.55) 50.4%, transparent 51%),
      linear-gradient(
        90deg,
        rgba(0, 0, 0, 0.025) 0 25%,
        transparent 25% 50%,
        rgba(0, 0, 0, 0.025) 50% 75%,
        transparent 75%
      ),
      #f8f3e6;
  }

  .marks {
    position: absolute;
    inset: 0;
    opacity: 0;
  }

  .open .half.top {
    animation: settle 0.35s ease-out both;
  }
  .open .half.bottom {
    animation: swing-down 0.55s cubic-bezier(0.3, 0.7, 0.35, 1) 0.12s both;
  }
  .open .marks {
    opacity: 1;
    transition: opacity 0.3s ease 0.6s;
  }
  .closing .half.top {
    animation: settle 0.3s ease-in 0.3s reverse both;
  }
  .closing .half.bottom {
    animation: swing-down 0.4s cubic-bezier(0.6, 0, 0.7, 0.3) reverse both;
  }
  @media (prefers-reduced-motion: reduce) {
    .half {
      animation: none !important;
    }
  }
  @keyframes settle {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }
  @keyframes swing-down {
    from {
      opacity: 0;
      transform: perspective(var(--persp)) rotateX(-95deg);
    }
    30% {
      opacity: 1;
    }
    to {
      transform: perspective(var(--persp)) rotateX(0deg);
    }
  }

  :global([data-theme='dark']) .paper {
    filter: brightness(0.82) saturate(0.9);
  }

  .title {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    font-family: 'Mansalva', cursive;
    font-size: calc(28px / var(--cam));
    color: rgba(47, 58, 63, 0.72);
    pointer-events: none;
  }
  .title strong {
    font-weight: 400;
    color: var(--count);
    margin-right: 0.15em;
  }

  .map {
    position: absolute;
    overflow: visible;
    pointer-events: none;
  }
  .nation,
  .states {
    fill: none;
    stroke-linejoin: round;
  }
  .nation {
    stroke: var(--line);
  }
  .states {
    stroke: var(--line-soft);
  }
  .inset {
    fill: none;
    stroke: var(--line-soft);
  }
  .leader {
    stroke: var(--slot);
    opacity: 0.6;
  }
  .leader.visited {
    opacity: 1;
  }
  .true-dot {
    fill: var(--slot);
  }
  .true-dot.visited {
    fill: var(--ink);
  }

  .empty {
    position: absolute;
    width: var(--size);
    height: var(--size);
    translate: -50% -50%;
    padding: 0;
    border-radius: 50%;
    background: transparent;
    border: calc(1.5px / var(--cam)) dashed var(--slot);
    cursor: pointer;
    transition: scale 0.15s ease;
  }
  .empty::after {
    content: '';
    position: absolute;
    inset: calc(-10px / var(--cam));
    border-radius: 50%;
  }
  .empty:hover {
    scale: 1.2;
  }
</style>
