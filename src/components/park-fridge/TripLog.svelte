<script lang="ts">
  import { visitsNewestFirst, type Park } from '../../data/parks';
  import MagnetFace from './MagnetFace.svelte';
  import Polaroid from './Polaroid.svelte';
  import { formatCoords, formatMonth, STATE_NAMES } from './format';
  import { tiltFor } from './layout';

  let { park }: { park: Park } = $props();

  // One Polaroid per visit, newest first; tapping the stack brings the next forward.
  const visits = $derived(visitsNewestFirst(park));
  let current = $state(0);
  const visit = $derived(visits[current] ?? {});
  const next = $derived(visits[(current + 1) % visits.length]);
  const behind = $derived(visits.filter((_, i) => i !== current).slice(0, 2));
  const many = $derived(visits.length > 1);
</script>

<article class="log">
  <div class="side">
    <div class="magnet">
      <MagnetFace {park} />
    </div>
    <div class="titles">
      <h2>{park.name}<span>National Park</span></h2>
      <p class="where">{STATE_NAMES[park.state] ?? park.state}</p>
      <p class="coords">{formatCoords(park.coordinates)}</p>
      <ul class="badges">
        {#if visit.date}<li>visited {formatMonth(visit.date)}</li>{/if}
        {#if many}<li>{visits.length} visits</li>{/if}
      </ul>
    </div>
  </div>

  <div class="body">
    <div class="stack">
      {#each behind as v, i (v.date)}
        <div class="behind" style={`--i:${i + 1}`}>
          <Polaroid {park} visit={v} tilt={(i % 2 ? -1 : 1) * (4 + i * 2)} />
        </div>
      {/each}
      <svelte:element
        this={many ? 'button' : 'div'}
        class="front"
        role={many ? undefined : 'presentation'}
        onclick={many ? () => (current = (current + 1) % visits.length) : undefined}
        aria-label={many ? `Show the ${formatMonth(next.date)} visit` : undefined}
      >
        {#key current}
          <Polaroid {park} {visit} tilt={tiltFor(park.id + current) * 0.6} />
        {/key}
      </svelte:element>
    </div>
    {#if many}
      <p class="hint">tap the photo for the {formatMonth(next.date)} visit</p>
    {/if}
    {#if visit.note}
      <p class="note">{visit.note}</p>
    {/if}
  </div>
</article>

<style>
  .log {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
    gap: clamp(20px, 4vw, 48px);
    align-items: start;
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .magnet {
    width: min(100%, 280px);
    aspect-ratio: 1.4;
    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.25)) drop-shadow(0 10px 14px rgba(0, 0, 0, 0.2));
    transition: rotate 0.3s ease;
    rotate: -3deg;
  }
  .magnet:hover {
    rotate: 0deg;
  }
  h2 {
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-weight: 400;
    font-size: clamp(34px, 5vw, 52px);
    line-height: 0.95;
    letter-spacing: 0.02em;
    color: var(--ink);
    margin: 0;
  }
  h2 span {
    display: block;
    font-size: 0.42em;
    letter-spacing: 0.25em;
    color: var(--ink-soft);
    margin-top: 0.3em;
  }
  .where {
    margin: 10px 0 0;
    font-size: 18px;
  }
  .coords {
    margin: 2px 0 0;
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 12px;
    letter-spacing: 0.04em;
    color: var(--ink-soft);
  }
  .badges {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 14px 0 0;
    padding: 0;
  }
  .badges li {
    font-size: 15px;
    padding: 2px 12px;
    border-radius: 999px;
    border: 1.5px dashed var(--line);
  }

  .body {
    padding-top: 14px;
  }
  .stack {
    position: relative;
    width: min(100%, 340px);
    margin: 0 auto;
  }
  .behind {
    position: absolute;
    inset: 0;
    translate: calc(var(--i) * 10px) calc(var(--i) * 6px);
    opacity: 0.9;
  }
  .front {
    position: relative;
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
  }
  button.front {
    cursor: pointer;
  }
  button.front:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 6px;
  }
  button.front :global(.polaroid) {
    animation: shuffle-in 0.35s ease;
  }
  @keyframes shuffle-in {
    from {
      translate: 16px 10px;
      opacity: 0.6;
    }
  }
  .hint {
    margin: 14px 0 0;
    text-align: center;
    font-size: 14px;
    color: var(--ink-soft);
  }
  .note {
    margin: 22px 0 0;
    font-size: clamp(18px, 2vw, 21px);
    line-height: 1.45;
  }

  @media (max-width: 700px) {
    .log {
      grid-template-columns: 1fr;
    }
    .side {
      flex-direction: row;
      align-items: center;
      gap: 14px;
    }
    .magnet {
      width: 110px;
      flex: none;
    }
    h2 {
      font-size: 32px;
    }
    .stack {
      width: min(82%, 300px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    button.front :global(.polaroid) {
      animation: none;
    }
  }
</style>
