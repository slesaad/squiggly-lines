<script lang="ts">
  import { untrack } from 'svelte';
  import { Spring } from 'svelte/motion';
  import type { Park } from '../../data/parks';
  import MagnetFace from './MagnetFace.svelte';
  import type { MagnetTarget } from './layout';

  interface Props {
    park: Park;
    target: MagnetTarget;
    // Spot on the map in map mode. The magnet glides there with a CSS transition
    // (translate, scale, rotate only) so the move stays on the compositor while
    // the camera zooms.
    pin?: MagnetTarget | null;
    glideDelay?: number; // ms before this magnet sets off for or from the map
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
    draggable: boolean;
    z?: number;
    reduceMotion?: boolean;
    label: string;
    onpickup?: (id: string) => void;
    ondrop?: (id: string, x: number, y: number) => void;
    onnudge?: (id: string, dx: number, dy: number) => void;
    onactivate?: (id: string) => void;
  }

  let {
    park,
    target,
    pin = null,
    glideDelay = 0,
    bounds,
    draggable,
    z = 1,
    reduceMotion = false,
    label,
    onpickup,
    ondrop,
    onnudge,
    onactivate,
  }: Props = $props();

  // Starts at the first target; later targets are followed by the effect below.
  const spring = new Spring(untrack(() => ({ ...target })), { stiffness: 0.08, damping: 0.42 });

  let dragging = $state(false);
  let hovered = $state(false);
  let snapping = $state(false);
  // A little tug when the mouse arrives, hinting that the magnet comes loose.
  let tugging = $state(false);

  $effect(() => {
    const t = { ...target };
    if (dragging) return;
    if (reduceMotion) spring.set(t, { instant: true });
    else spring.target = t;
  });

  const c = $derived(spring.current);
  // Where the magnet is shown: its fridge spot, or its pin on the map.
  const at = $derived(pin ?? c);
  const pinScale = $derived(pin ? pin.w / c.w : 1);
  // On while gliding between the fridge spot and the map.
  let gliding = $state(false);
  const onMap = $derived(!!pin);
  let wasOnMap = untrack(() => onMap);
  $effect(() => {
    if (onMap === wasOnMap) return;
    wasOnMap = onMap;
    if (!reduceMotion) gliding = true;
  });
  // The door's top edge clips anything above it, so near the top the name tag hangs below instead.
  const tagBelow = $derived(!pin && c.y - c.h / 2 - 44 < 0);
  // While springing back to a new spot (e.g. after Reset), the magnet is lifted off the door.
  const travelling = $derived(!dragging && Math.hypot(c.x - target.x, c.y - target.y) > 12);

  // Pointer press bookkeeping: a press only becomes a drag after moving more
  // than DRAG_THRESHOLD px, so a slightly shaky click still opens the trip log.
  const DRAG_THRESHOLD = 4;
  let press: { px: number; py: number; x: number; y: number; moved: boolean; cancelled: boolean } | null = null;

  function onpointerdown(e: PointerEvent) {
    if (e.button !== 0) return;
    press = { px: e.clientX, py: e.clientY, x: c.x, y: c.y, moved: false, cancelled: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onpointermove(e: PointerEvent) {
    if (!press || press.cancelled) return;
    const dx = e.clientX - press.px;
    const dy = e.clientY - press.py;
    if (!press.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!draggable) {
      // A press that wanders while dragging is off is not a tap either.
      press.cancelled = true;
      return;
    }
    if (!press.moved) {
      press.moved = true;
      dragging = true;
      onpickup?.(park.id);
    }
    const x = Math.min(bounds.maxX, Math.max(bounds.minX, press.x + dx));
    const y = Math.min(bounds.maxY, Math.max(bounds.minY, press.y + dy));
    spring.set({ ...spring.current, x, y }, { instant: true });
  }

  function onpointerup() {
    if (!press) return;
    const { moved, cancelled } = press;
    press = null;
    if (moved) {
      // Report the drop before releasing `dragging`, so the target effect
      // already sees the new resting spot and doesn't spring back.
      ondrop?.(park.id, spring.current.x, spring.current.y);
      dragging = false;
      snapping = true;
    } else if (!cancelled) {
      onactivate?.(park.id);
    }
  }

  function onpointercancel() {
    if (press?.moved) {
      ondrop?.(park.id, spring.current.x, spring.current.y);
      dragging = false;
    }
    press = null;
  }

  // Keyboard: Enter/Space arrive as a click with detail 0; arrows nudge.
  function onclick(e: MouseEvent) {
    if (e.detail === 0) onactivate?.(park.id);
  }

  function onkeydown(e: KeyboardEvent) {
    if (!draggable) return;
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    onnudge?.(park.id, move[0], move[1]);
  }
</script>

<div
  class="slot"
  class:gliding
  class:pinned={onMap}
  style={`transform: translate(${at.x}px, ${at.y}px); z-index: ${dragging ? 1000 : hovered ? 999 : z}; --glide-delay: ${glideDelay}ms;`}
  ontransitionend={(e) => e.target === e.currentTarget && (gliding = false)}
>
  <button
    class="magnet"
    class:dragging
    class:travelling
    class:snapping
    class:tugging
    style={`width:${c.w}px; height:${c.h}px; --rot:${at.rot}deg; --s:${pinScale};`}
    aria-label={label}
    data-park-id={park.id}
    {onpointerdown}
    {onpointermove}
    {onpointerup}
    {onpointercancel}
    {onclick}
    {onkeydown}
    onpointerenter={(e) => {
      hovered = true;
      if (draggable && !dragging && e.pointerType === 'mouse') tugging = true;
    }}
    onpointerleave={() => (hovered = false)}
    onfocus={() => (hovered = true)}
    onblur={() => (hovered = false)}
    onanimationend={() => (snapping = tugging = false)}
  >
    <span class="face">
      <MagnetFace {park} />
    </span>
  </button>

  {#if hovered && !dragging}
    <div
      class="fridge-tag"
      style={tagBelow
        ? `transform: translate(-50%, calc(${at.h / 2}px + 12px / var(--cam, 1)));`
        : `transform: translate(-50%, calc(-100% - ${at.h / 2}px - 10px / var(--cam, 1)));`}
      role="status"
    >
      {label}
    </div>
  {/if}
</div>

<style>
  .slot {
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
  }
  /* Gliding to or from the map: one eased move, no spring. */
  .slot.gliding {
    transition: transform 0.85s cubic-bezier(0.45, 0, 0.2, 1) var(--glide-delay);
  }

  .magnet {
    position: absolute;
    left: 0;
    top: 0;
    translate: -50% -50%;
    rotate: var(--rot);
    /* --s shrinks the magnet to its pin size on the map. */
    scale: var(--s);
    --px: calc(1px / var(--cam, 1) / var(--s));
    padding: 0;
    border: 0;
    background: none;
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition:
      scale 0.18s ease,
      rotate 0.2s ease;
  }
  .gliding .magnet {
    transition:
      scale 0.85s cubic-bezier(0.45, 0, 0.2, 1) var(--glide-delay),
      rotate 0.85s cubic-bezier(0.45, 0, 0.2, 1) var(--glide-delay);
  }
  .magnet.dragging {
    cursor: grabbing;
    scale: 1.07;
  }
  .magnet:hover:not(.dragging),
  .magnet:focus-visible {
    scale: calc(var(--s) * 1.05);
    rotate: calc(var(--rot) * 0.3);
  }
  .pinned .magnet {
    cursor: pointer;
  }
  /* Small on the map, so they lift further and straighten fully. */
  .pinned:not(.gliding) .magnet:hover,
  .pinned:not(.gliding) .magnet:focus-visible {
    scale: calc(var(--s) * 1.3);
    rotate: 0deg;
  }
  /* Focus shows as the lift above plus the name tag, not a ring. */
  .magnet:focus,
  .magnet:focus-visible {
    outline: none;
  }
  /* Lifts a hair off the door and wobbles, as if testing how loose it is. */
  .magnet.tugging {
    animation: tug 0.45s ease-out;
  }
  @keyframes tug {
    30% {
      transform: translateY(-3px) rotate(-2.5deg);
    }
    60% {
      transform: translateY(-2px) rotate(1.8deg);
    }
    85% {
      transform: translateY(-1px) rotate(-0.6deg);
    }
  }
  /* Magnetic snap on drop: a quick press flat against the door. */
  .magnet.snapping {
    animation: snap 0.22s ease-out;
  }
  @keyframes snap {
    0% {
      scale: 1.07;
    }
    55% {
      scale: 0.97;
    }
    100% {
      scale: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .magnet,
    .face {
      transition: none;
    }
    .magnet.snapping,
    .magnet.tugging {
      animation: none;
    }
  }

  /*
   * Resting magnets sit close to the metal; lifted ones cast a longer, softer
   * shadow. Shadows are in screen pixels: `--px` undoes both the camera scale
   * the door is seen at (`--cam`, larger on the map) and the magnet's own
   * shrink to pin size (`--s`).
   */
  .face {
    position: absolute;
    inset: 0;
    display: block;
    pointer-events: none;
    filter: drop-shadow(0 calc(1 * var(--px)) calc(1 * var(--px)) rgba(0, 0, 0, 0.3))
      drop-shadow(0 calc(4 * var(--px)) calc(6 * var(--px)) rgba(0, 0, 0, 0.18));
    transition: filter 0.2s ease;
  }
  .magnet:hover .face {
    filter: drop-shadow(0 calc(2 * var(--px)) calc(2 * var(--px)) rgba(0, 0, 0, 0.25))
      drop-shadow(0 calc(8 * var(--px)) calc(12 * var(--px)) rgba(0, 0, 0, 0.2));
  }
  .magnet.travelling {
    scale: calc(var(--s) * 1.06);
  }
  .magnet.travelling .face,
  .gliding .face,
  .magnet.dragging .face {
    filter: drop-shadow(0 calc(6 * var(--px)) calc(4 * var(--px)) rgba(0, 0, 0, 0.2))
      drop-shadow(0 calc(18 * var(--px)) calc(22 * var(--px)) rgba(0, 0, 0, 0.28));
  }

  /* The shadow swaps once as a glide starts, rather than repainting throughout. */
  .gliding .face {
    transition: none;
  }
</style>
