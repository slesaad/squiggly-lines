<script lang="ts">
  import { goBack } from '../lib/back';
  import { onMount } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { getBase } from '../consts';
  import { parks, isVisited, visitsNewestFirst, type Park } from '../data/parks';
  import { MAP_WIDTH, MAP_HEIGHT, pinRadii, truePositions, pinPositions } from '../data/park-map';
  import { fridgeLayout, type FridgeSpot } from '../data/fridge-layout';
  import Magnet from './park-fridge/Magnet.svelte';
  import Dialog from './park-fridge/Dialog.svelte';
  import TripLog from './park-fridge/TripLog.svelte';
  import ParkList from './park-fridge/ParkList.svelte';
  import WallArt from './park-fridge/WallArt.svelte';
  import PaperMap from './park-fridge/PaperMap.svelte';
  import { magnetImageFor, photoBox, MAGNET_ASPECT } from './park-fridge/magnet-image';
  import { autoFridgeLayout, clamp, clamp01, round3, tiltFor, type MagnetTarget } from './park-fridge/layout';

  const STORAGE_KEY = 'park-fridge:positions:v2';

  const visitedParks = parks.filter(isVisited);
  const visitedCount = visitedParks.length;
  const totalCount = parks.length;

  let mode: 'fridge' | 'map' = $state('fridge');
  let doorW = $state(0);
  let fridgeW = $state(0);
  let sceneW = $state(0);
  let sceneH = $state(0);
  // When the fridge spans (nearly) the whole screen, the site's floating theme
  // button sits on top of the door's bottom-left corner.
  const toggleOverDoor = $derived(sceneW > 0 && sceneW - fridgeW < 140);
  let doorH = $state(0);
  // The "16 / 63" counter counts up on load.
  const count = new Tween(0, { duration: 1200, easing: cubicOut });
  let reduceMotion = $state(false);
  let arranging = $state(false);
  let copied = $state(false);
  let selectedId: string | null = $state(null);
  let listOpen = $state(false);
  const selectedPark = $derived(parks.find((p) => p.id === selectedId) ?? null);
  let stageEl: HTMLElement | undefined = $state();
  let doorEl: HTMLElement | undefined = $state();
  // Where the door sits inside the (untransformed) stage, for the camera move.
  let doorPos = $state({ x: 0, y: 0 });
  // The paper map plays its fold animation while the camera pulls back.
  let paperClosing = $state(false);

  // The map view only makes sense with room for a wide map; phones stay in
  // fridge mode.
  const canMap = $derived(sceneW >= 760);
  // Wall space to the right of the fridge, for the framed art.
  const artWidth = $derived(Math.min(360, (sceneW - fridgeW) / 2 - 110));

  // Positions a reader has dragged magnets to.
  let readerSpots: Record<string, FridgeSpot> = $state({});
  // Stacking order: the most recently picked-up magnet sits on top.
  let stack: string[] = $state(visitedParks.map((p) => p.id));

  // Room kept clear for the door handle on the right.
  const handleSpace = $derived(Math.max(36, doorW * 0.1));

  // ---- Map placement --------------------------------------------------------

  // In map mode a paper road map is stuck to the door and the camera moves in
  // until the paper fills the screen. The paper is laid out in door pixels;
  // `cam` is the camera scale that brings it to its on-screen size.
  const PAPER_PAD = 26; // map units of paper around the map
  const PAPER_TITLE = 58; // map units above the map for the printed title

  const paper = $derived.by(() => {
    if (!doorW || !doorH || !sceneW || !sceneH) return null;
    const unitsW = MAP_WIDTH + PAPER_PAD * 2;
    const unitsH = MAP_HEIGHT + PAPER_PAD * 2 + PAPER_TITLE;
    // On the door: left of the handle, centered vertically.
    const side = Math.max(14, doorW * 0.05);
    let k = (doorW - handleSpace - side) / unitsW;
    k = Math.min(k, (doorH - side * 2) / unitsH);
    const w = unitsW * k;
    const h = unitsH * k;
    const box = { x: side, y: (doorH - h) / 2, w, h, k };
    // On screen: as large as fits, clear of the back link and controls.
    const marginX = Math.max(24, sceneW * 0.05);
    const marginY = 18;
    const screenScale = Math.min((sceneW - marginX * 2) / unitsW, (sceneH - marginY * 2) / unitsH);
    const cam = screenScale / k;
    const screen = { x: (sceneW - unitsW * screenScale) / 2, y: (sceneH - unitsH * screenScale) / 2 };
    return { box, cam, screen, layout: (MAP_WIDTH * screenScale < 640 ? 'compact' : 'wide') as 'wide' | 'compact' };
  });

  const camera = $derived.by(() => {
    if (!paper) return 'none';
    const { box, cam, screen } = paper;
    const tx = screen.x - cam * (doorPos.x + box.x);
    const ty = screen.y - cam * (doorPos.y + box.y);
    return `translate(${tx}px, ${ty}px) scale(${cam})`;
  });

  // The door's offset inside the stage, read from layout offsets so it is
  // unaffected by the camera transform.
  function measureDoor() {
    if (!doorEl || !stageEl) return;
    let x = 0;
    let y = 0;
    let el: HTMLElement | null = doorEl;
    while (el && el !== stageEl) {
      x += el.offsetLeft;
      y += el.offsetTop;
      el = el.offsetParent as HTMLElement | null;
    }
    doorPos = { x, y };
  }

  $effect(() => {
    // Re-measure whenever the scene or fridge changes size.
    void [sceneW, sceneH, fridgeW, doorW, doorH];
    measureDoor();
  });

  // A magnet's spot on the paper map, in door pixels: sized to its pin in the
  // collision layout, tilted a little as if stuck on by hand.
  function pinTarget(park: Park): MagnetTarget | null {
    if (!paper) return null;
    const { box, layout } = paper;
    const [mx, my] = pinPositions[layout][park.id];
    const d = pinRadii[layout].visited * 2 * box.k;
    const { aspect } = magnetImageFor(park);
    return {
      x: box.x + (PAPER_PAD + mx) * box.k,
      y: box.y + (PAPER_PAD + PAPER_TITLE + my) * box.k,
      rot: tiltFor(park.id),
      w: aspect >= 1 ? d : d * aspect,
      h: aspect >= 1 ? d / aspect : d,
    };
  }

  // ---- Fridge placement -----------------------------------------------------

  const magnetSize = $derived.by(() => {
    // Until the door is measured, a nominal size keeps the magnets' springs finite.
    const w = doorW && doorH ? Math.min(doorW * 0.2, doorH * 0.16) : 85;
    return { w, h: w / MAGNET_ASPECT };
  });

  // The rectangle a magnet's center may occupy, so magnets never hang off the door.
  const fridgeArea = $derived.by(() => {
    const padX = Math.max(10, doorW * 0.03);
    const padY = Math.max(12, doorH * 0.05);
    const { w, h } = magnetSize;
    return {
      minX: padX + w / 2,
      maxX: doorW - handleSpace - padX - w / 2,
      // On phones the nameplate sits at the top of the door; keep it uncovered.
      minY: padY + h / 2 + (canMap ? 0 : 30),
      // Phones keep the bottom strip clear of the site's floating theme button.
      maxY: doorH - padY - h / 2 - (toggleOverDoor ? 44 : 0),
    };
  });

  const fridgeSpots = $derived.by(() => {
    const fixed: Record<string, FridgeSpot> = {};
    for (const p of visitedParks) {
      const spot = readerSpots[p.id] ?? fridgeLayout[p.id];
      if (spot) fixed[p.id] = spot;
    }
    const loose = visitedParks.filter((p) => !fixed[p.id]).map((p) => p.id);
    const area = fridgeArea;
    const { w, h } = magnetSize;
    const areaW = area.maxX - area.minX;
    const areaH = area.maxY - area.minY;
    const n = visitedParks.length;
    // Roomy spacing first; fall back to edge-to-edge cells; only overlap when
    // there is no other way to fit everything.
    const fit = (sx: number, sy: number) => [
      Math.max(2, Math.floor(areaW / (w * sx)) + 1),
      Math.max(2, Math.floor(areaH / (h * sy)) + 1),
    ];
    let [cols, rows] = fit(1.25, 1.35);
    if (cols * rows < n) [cols, rows] = fit(1.04, 1.06);
    while (cols * rows < n) {
      if (cols / rows < areaW / areaH) cols++;
      else rows++;
    }
    return { ...fixed, ...autoFridgeLayout(loose, Object.values(fixed), cols, rows) };
  });

  function toDoor(spot: FridgeSpot): [number, number] {
    const a = fridgeArea;
    return [a.minX + spot.x * (a.maxX - a.minX), a.minY + spot.y * (a.maxY - a.minY)];
  }

  function toSpot(x: number, y: number, rotation: number): FridgeSpot {
    const a = fridgeArea;
    return {
      x: round3(clamp01((x - a.minX) / (a.maxX - a.minX || 1))),
      y: round3(clamp01((y - a.minY) / (a.maxY - a.minY || 1))),
      rotation,
    };
  }

  function targetFor(park: Park): MagnetTarget {
    const spot = fridgeSpots[park.id];
    const [x, y] = toDoor(spot);
    return { x, y, rot: spot.rotation, ...photoBox(magnetSize.w, magnetSize.h, magnetImageFor(park).aspect) };
  }

  // ---- Reader layout persistence -------------------------------------------

  function loadReaderSpots() {
    try {
      readerSpots = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
      // Storage unavailable (private mode, blocked): the author layout still works.
    }
  }

  function saveReaderSpots() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readerSpots));
    } catch {
      // Not persisted; positions still hold for this visit.
    }
  }

  const hasReaderSpots = $derived(Object.keys(readerSpots).length > 0);

  function bringToFront(id: string) {
    stack = [...stack.filter((s) => s !== id), id];
  }

  function handleDrop(id: string, x: number, y: number) {
    const rotation = fridgeSpots[id].rotation;
    readerSpots = { ...readerSpots, [id]: toSpot(x, y, rotation) };
    saveReaderSpots();
  }

  function handleNudge(id: string, dx: number, dy: number) {
    const [x, y] = toDoor(fridgeSpots[id]);
    const a = fridgeArea;
    bringToFront(id);
    handleDrop(id, clamp(x + dx, a.minX, a.maxX), clamp(y + dy, a.minY, a.maxY));
  }

  function resetLayout() {
    readerSpots = {};
    saveReaderSpots();
  }

  // Magnets slide onto the map west to east.
  const westToEast = [...visitedParks]
    .sort((a, b) => truePositions[a.id][0] - truePositions[b.id][0])
    .map((p) => p.id);

  // Each magnet's head start, in ms: onto the map west to east, back to the
  // fridge east to west. The stagger is short so every magnet shrinks along
  // with the camera move; it is a CSS transition delay, so the whole move
  // starts from a single update.
  function glideDelay(id: string) {
    const i = westToEast.indexOf(id);
    return (mode === 'map' ? i : westToEast.length - 1 - i) * 20;
  }

  function toggleMode() {
    if (mode === 'fridge' && !canMap) return;
    if (mode === 'fridge') {
      measureDoor();
      mode = 'map';
      paperClosing = false;
    } else {
      mode = 'fridge';
      paperClosing = !reduceMotion;
    }
  }

  $effect(() => {
    if (!canMap && mode === 'map') mode = 'fridge';
  });

  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && mode === 'map' && !selectedId && !listOpen) toggleMode();
  }

  function closeTripLog() {
    const id = selectedId;
    selectedId = null;
    // Hand focus back to the magnet the log was opened from.
    if (id) document.querySelector<HTMLElement>(`[data-park-id="${id}"]`)?.focus({ preventScroll: true });
  }

  function openFromList(id: string) {
    listOpen = false;
    selectedId = id;
  }

  // ---- Author arrange mode ---------------------------------------------------

  // Copies the current spots as the object literal for src/data/fridge-layout.ts.
  async function copyLayout() {
    const rows = visitedParks.map(({ id }) => {
      const { x, y, rotation } = fridgeSpots[id];
      return `  '${id}': { x: ${x}, y: ${y}, rotation: ${rotation} },`;
    });
    const text = `{\n${rows.join('\n')}\n}`;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch {
      console.log(text);
    }
  }

  // ---- Misc ------------------------------------------------------------------

  function magnetLabel(park: Park) {
    const year = visitsNewestFirst(park)[0]?.date?.slice(0, 4);
    return year ? `${park.name} · ${year}` : `${park.name} · ${park.state}`;
  }

  onMount(() => {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    arranging = new URLSearchParams(window.location.search).has('arrange');
    loadReaderSpots();
    count.set(visitedCount, reduceMotion ? { duration: 0 } : undefined);
  });

  function handleBack(e: MouseEvent) {
    goBack(e);
  }
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Yellowtail&display=swap" rel="stylesheet" />
</svelte:head>

<svelte:window onkeydown={onWindowKeydown} />

{#snippet modeSwitch()}
  <button class="mode-switch" role="switch" aria-checked={mode === 'map'} aria-label="Show the map" onclick={toggleMode}>
    <span class="mode-label" class:on={mode === 'fridge'}>fridge</span>
    <span class="road" aria-hidden="true"><span class="thumb"></span></span>
    <span class="mode-label" class:on={mode === 'map'}>map</span>
  </button>
{/snippet}

{#snippet tally()}
  <span class="count">{Math.round(count.current)}</span><span class="slash">/</span><span class="total">{totalCount}</span>
{/snippet}

{#snippet tools()}
  <div class="tools">
    <button class="tool" onclick={() => (listOpen = true)}>list</button>
    <button class="tool" onclick={resetLayout} disabled={!hasReaderSpots}>reset</button>
    {#if arranging}
      <button class="tool" onclick={copyLayout}>{copied ? 'copied!' : 'copy layout'}</button>
    {/if}
  </div>
{/snippet}

<div
  class="scene"
  bind:clientWidth={sceneW}
  bind:clientHeight={sceneH}
  class:map-mode={mode === 'map'}
>
  <a class="back-link" href={`${getBase()}posts/`} onclick={handleBack}>&lt;&lt; go back</a>

  <!-- The switch stays put on the wall, low on the right, in both views. -->
  {#if canMap}
    <div class="page-controls">
      {#if mode === 'map'}
        <button class="tool" onclick={() => (listOpen = true)}>list</button>
      {/if}
      {@render modeSwitch()}
    </div>
  {/if}

  <div class="stage" bind:this={stageEl} style={`--zoom: ${camera};`}>
    <div class="floor" aria-hidden="true"></div>

    {#if canMap && artWidth >= 180}
      <div class="wall-art" style={`--art-w: ${artWidth}px`} inert={mode === 'map'}>
        <WallArt width={artWidth} />
      </div>
    {/if}

    {#if canMap}
      <!-- Title card on the wall beside the fridge. -->
      <div class="wall-intro" style={`max-width:${Math.max(160, (sceneW - fridgeW) / 2 - 64)}px`} inert={mode === 'map'}>
        <h1 class="title" aria-label={`${visitedCount} of ${totalCount} national parks`}>{@render tally()}</h1>
        <p class="tagline">national parks collected, one magnet at a time</p>
        {@render tools()}
      </div>
    {/if}

    <div class="fridge" bind:clientWidth={fridgeW}>
      <div class="freezer">
        {#if !canMap}
          <div class="counter" aria-label={`${visitedCount} of ${totalCount} national parks visited`}>{@render tally()}</div>
          <div class="counter-label">national parks collected</div>
          <div class="toolbar">{@render tools()}</div>
        {:else}
          <div class="badge badge-freezer" aria-hidden="true">squiggly lines</div>
        {/if}

        <div class="handle handle-freezer" aria-hidden="true"></div>
      </div>

      <div class="door" bind:this={doorEl} bind:clientWidth={doorW} bind:clientHeight={doorH}>
          <div class="handle handle-door" aria-hidden="true"></div>
          {#if !canMap}
            <div class="badge" aria-hidden="true">squiggly lines</div>
          {/if}

          {#if paper && canMap}
            <PaperMap
              box={paper.box}
              pad={PAPER_PAD}
              titleBand={PAPER_TITLE}
              cam={paper.cam}
              layout={paper.layout}
              open={mode === 'map'}
              closing={paperClosing}
              {visitedCount}
              {totalCount}
              onclosed={() => (paperClosing = false)}
            />
          {/if}

          <div class="magnets" style={`--cam:${mode === 'map' && paper ? paper.cam : 1}`}>
            {#each visitedParks as park (park.id)}
              <Magnet
                {park}
                target={targetFor(park)}
                pin={mode === 'map' ? pinTarget(park) : null}
                glideDelay={glideDelay(park.id)}
                bounds={fridgeArea}
                draggable={mode === 'fridge'}
                z={stack.indexOf(park.id) + 1}
                {reduceMotion}
                label={magnetLabel(park)}
                onpickup={bringToFront}
                ondrop={handleDrop}
                onnudge={handleNudge}
                onactivate={(id) => (selectedId = id)}
              />
            {/each}
          </div>
      </div>

      <div class="feet" aria-hidden="true"></div>
    </div>
  </div>

  <Dialog open={!!selectedPark} label={selectedPark ? `${selectedPark.name} trip log` : 'Trip log'} onclose={closeTripLog}>
    {#if selectedPark}
      {#key selectedPark.id}
        <TripLog park={selectedPark} />
      {/key}
    {/if}
  </Dialog>

  <Dialog open={listOpen} label="All national parks" onclose={() => (listOpen = false)}>
    <ParkList onopen={openFromList} />
  </Dialog>
</div>

<style>
  /*
   * A 1950s-style kitchen: pinstriped wallpaper, a black-and-white checkered
   * floor, and a tall, rounded, glossy enamel fridge with chrome trim.
   */
  .scene {
    --wall: #efe7d6;
    --wall-stripe: rgba(255, 255, 255, 0.55);
    --baseboard: #2f2f31;
    --floor-a: #f2ede3;
    --floor-b: #3a3a3c;
    --floor-h: clamp(48px, 11vh, 110px);
    --chrome-a: #ffffff;
    --chrome-b: #b4b9bf;
    --chrome-c: #6b7178;
    --tag-bg: #fffaf0;
    --tag-ink: #3a2c1e;
    --radius-top: clamp(34px, 7vw, 78px);
    --radius-bottom: clamp(26px, 5vw, 56px);

    /* Pastel orange enamel, with dark ink for the labels on it. */
    --paint: #f7b27a;
    --paint-shade: #c47e47;
    --count: #b3211a;
    --ink: #2e2416;
    --ink-soft: rgba(46, 36, 22, 0.66);
    --line-soft: rgba(46, 36, 22, 0.22);

    position: relative;
    height: 100vh;
    height: 100dvh;
    background:
      radial-gradient(ellipse at 50% 35%, transparent 35%, rgba(0, 0, 0, 0.12)),
      repeating-linear-gradient(90deg, transparent 0 34px, var(--wall-stripe) 34px 36px, transparent 36px 44px, var(--wall-stripe) 44px 45px),
      var(--wall);
    font-family: 'Schoolbell', cursive;
    color: var(--ink);
    overflow: hidden;
  }

  :global([data-theme='dark']) .scene {
    --wall: #1b1d21;
    --wall-stripe: rgba(255, 255, 255, 0.025);
    --baseboard: #0b0c0d;
    --floor-a: #2d2e31;
    --floor-b: #121315;
  }

  .back-link {
    position: absolute;
    top: clamp(16px, 3vw, 34px);
    left: clamp(16px, 3vw, 34px);
    z-index: 20;
    font-size: 14px;
    color: var(--accent-color);
    background: var(--bg-color);
    padding: 6px 12px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    text-decoration: none;
  }
  .back-link:hover {
    text-decoration: underline;
  }

  /* Checkered floor receding from the viewer, with a baseboard along the wall. */
  .floor {
    position: absolute;
    left: -40%;
    right: -40%;
    bottom: 0;
    height: var(--floor-h);
    border-top: 6px solid var(--baseboard);
    background: repeating-conic-gradient(var(--floor-a) 0 25%, var(--floor-b) 0 50%) 0 0 / 64px 64px;
    transform: perspective(260px) rotateX(38deg);
    transform-origin: 50% 100%;
  }
  .floor::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.3), transparent 70%);
  }

  /*
   * The body: a tall, heavily rounded shell. Its darker shade shows as the
   * seam between the doors.
   */
  .fridge {
    position: relative;
    z-index: 1;
    width: min(100%, 640px, calc((100dvh - var(--floor-h) * 0.45 - 40px) * 0.62));
    height: calc(100% - var(--floor-h) * 0.45 - 14px);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 3px;
    border-radius: var(--radius-top) var(--radius-top) var(--radius-bottom) var(--radius-bottom);
    background: var(--paint-shade);
    box-shadow:
      22px 26px 44px -16px rgba(0, 0, 0, 0.45),
      0 2px 6px rgba(0, 0, 0, 0.2);
  }
  /* Contact shadow where the feet meet the floor. */
  .fridge::after {
    content: '';
    position: absolute;
    left: 6%;
    right: 6%;
    bottom: -18px;
    height: 24px;
    border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.45), transparent 70%);
    z-index: -1;
  }

  /*
   * Glossy enamel: deep falloff where the body curves away at each side, a
   * sharp window-light streak near the left edge, a softer one on the right,
   * and a bright top edge.
   */
  .freezer,
  .door {
    position: relative;
    background:
      linear-gradient(90deg, rgba(0, 0, 0, 0.32) 0%, transparent 7%, transparent 90%, rgba(0, 0, 0, 0.38) 100%),
      linear-gradient(90deg, transparent 5%, rgba(255, 255, 255, 0.55) 9%, rgba(255, 255, 255, 0.12) 12%, transparent 15%),
      linear-gradient(90deg, transparent 78%, rgba(255, 255, 255, 0.2) 84%, transparent 89%),
      linear-gradient(180deg, rgba(255, 255, 255, 0.28), transparent 16%, transparent 84%, rgba(0, 0, 0, 0.16)),
      var(--paint);
    box-shadow:
      inset 0 2px 1px rgba(255, 255, 255, 0.55),
      inset 0 -2px 3px rgba(0, 0, 0, 0.2);
  }

  /* Counter on the left, controls stacked beside the handle. */
  .freezer {
    flex: 0 0 clamp(100px, 18vh, 168px);
    border-radius: calc(var(--radius-top) - 3px) calc(var(--radius-top) - 3px) 6px 6px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    padding-left: clamp(18px, 5%, 34px);
  }

  /* The main door below the freezer. */
  .door {
    flex: 1;
    border-radius: 6px 6px calc(var(--radius-bottom) - 3px) calc(var(--radius-bottom) - 3px);
    overflow: hidden;
  }

  /*
   * The camera: in map mode the whole kitchen scales up around the paper map
   * on the door until it fills the screen, while the map unfolds and the
   * magnets slide onto it (or back off it, on the way out).
   */
  .stage {
    position: absolute;
    inset: 0;
    padding: clamp(10px, 2.5vh, 26px) clamp(8px, 4vw, 56px) 0;
    transform-origin: 0 0;
    transition: transform 1s cubic-bezier(0.65, 0, 0.35, 1);
  }
  .map-mode .stage {
    transform: var(--zoom);
  }

  /* Chrome script nameplate at the top of the main door. */
  .badge {
    position: absolute;
    left: 50%;
    top: clamp(10px, 2vh, 18px);
    translate: -50% 0;
    rotate: -4deg;
    font-family: 'Yellowtail', 'Mansalva', cursive;
    font-size: clamp(22px, 2.6vw, 34px);
    line-height: 1.25;
    white-space: nowrap;
    padding: 0 0.15em;
    background: linear-gradient(180deg, #ffffff 0%, #d5d9dd 42%, #7e858c 52%, #eef0f2 74%, #a3a9b0 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.5)) drop-shadow(0 2px 3px rgba(0, 0, 0, 0.25));
    pointer-events: none;
  }

  /* On wider screens the freezer door is otherwise bare, so the nameplate goes there. */
  .badge-freezer {
    top: 50%;
    translate: -50% -50%;
    font-size: clamp(30px, 3.4vw, 46px);
  }

  /* Two short chrome feet under the body. */
  .feet {
    position: absolute;
    left: 12%;
    right: 12%;
    bottom: -12px;
    height: 13px;
    pointer-events: none;
  }
  .feet::before,
  .feet::after {
    content: '';
    position: absolute;
    top: 0;
    width: clamp(20px, 2.6vw, 30px);
    height: 100%;
    border-radius: 0 0 8px 8px;
    background: linear-gradient(90deg, var(--chrome-c), var(--chrome-a) 35%, var(--chrome-b) 70%, var(--chrome-c));
  }
  .feet::before {
    left: 0;
  }
  .feet::after {
    right: 0;
  }

  .counter {
    font-family: 'Mansalva', cursive;
    font-size: clamp(40px, 7vh, 72px);
    line-height: 1;
    display: flex;
    align-items: baseline;
    gap: 0.15em;
    font-variant-numeric: tabular-nums;
  }
  .count {
    color: var(--count);
    min-width: 1.1em;
    text-align: right;
  }
  .slash,
  .total {
    color: var(--ink-soft);
  }
  .counter-label {
    font-size: clamp(14px, 2.2vh, 18px);
    color: var(--ink-soft);
    margin-top: 4px;
  }

  /* Controls sit on the freezer door, just left of its handle. */
  .toolbar {
    position: absolute;
    right: clamp(40px, 11%, 64px);
    top: 50%;
    translate: 0 -50%;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }

  /*
   * The Magic Toggle: a paper card pinned to the wall, with a small round
   * magnet that slides along a dashed road between "fridge" and "map".
   */
  .mode-switch {
    --road: 34px;
    --thumb: 18px;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 12px;
    border: 0;
    border-radius: 4px;
    background: #fffdf8;
    rotate: -1.5deg;
    font: inherit;
    font-family: 'Bebas Neue', 'Oswald', sans-serif;
    font-size: 15px;
    letter-spacing: 0.14em;
    cursor: pointer;
    box-shadow:
      0 1px 2px rgba(0, 0, 0, 0.15),
      0 6px 14px -6px rgba(0, 0, 0, 0.3);
    transition:
      rotate 0.2s ease,
      box-shadow 0.2s ease;
  }
  .mode-switch:hover {
    rotate: 0deg;
    box-shadow:
      0 2px 3px rgba(0, 0, 0, 0.15),
      0 10px 18px -8px rgba(0, 0, 0, 0.35);
  }
  .mode-switch:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 4px;
  }
  .mode-label {
    color: #b9ab94;
    transition: color 0.2s ease;
  }
  .mode-label.on {
    color: #6b5a44;
  }
  .road {
    position: relative;
    width: calc(var(--road) + var(--thumb));
    height: var(--thumb);
    background: repeating-linear-gradient(90deg, #c9bba2 0 5px, transparent 5px 9px) center / calc(100% - var(--thumb)) 2px
      no-repeat;
  }
  .thumb {
    position: absolute;
    left: 0;
    top: 0;
    width: var(--thumb);
    height: var(--thumb);
    border-radius: 50%;
    background:
      radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.75), transparent 45%),
      #c8302c;
    box-shadow:
      0 2px 3px rgba(0, 0, 0, 0.35),
      inset 0 -2px 3px rgba(0, 0, 0, 0.25);
    transition: translate 0.35s cubic-bezier(0.4, 1.4, 0.5, 1);
  }
  .map-mode .thumb {
    translate: var(--road) 0;
  }

  .tools {
    display: flex;
    gap: 6px;
  }

  .tool {
    font: inherit;
    font-size: 14px;
    padding: 2px 10px;
    border-radius: 999px;
    border: 1px solid var(--line-soft);
    background: var(--tag-bg);
    color: var(--tag-ink);
    cursor: pointer;
  }
  .tool:disabled {
    opacity: 0.45;
    cursor: default;
  }

  /* Chrome bar handles on standoff mounts, casting a shadow onto the enamel. */
  .handle {
    position: absolute;
    right: clamp(14px, 2.4vw, 30px);
    width: clamp(10px, 1.2vw, 15px);
    border-radius: 999px;
    background: linear-gradient(90deg, var(--chrome-c), var(--chrome-a) 30%, var(--chrome-b) 65%, var(--chrome-c));
    box-shadow:
      7px 8px 10px rgba(0, 0, 0, 0.22),
      inset 0 0 0 1px rgba(0, 0, 0, 0.12);
  }
  .handle::before,
  .handle::after {
    content: '';
    position: absolute;
    left: 50%;
    width: 180%;
    height: clamp(12px, 1.6vw, 18px);
    translate: -50% 0;
    border-radius: 5px;
    background: linear-gradient(90deg, var(--chrome-c), var(--chrome-a) 35%, var(--chrome-b) 70%, var(--chrome-c));
    box-shadow: 4px 5px 6px rgba(0, 0, 0, 0.2);
  }
  .handle::before {
    top: -2px;
  }
  .handle::after {
    bottom: -2px;
  }
  .handle-freezer {
    bottom: 16%;
    height: 56%;
  }
  .handle-door {
    top: 5%;
    height: 32%;
    z-index: 2;
  }

  /*
   * Gallery on the wall right of the fridge, hung at eye level: the fridge
   * stands about 70" tall, so a 57" center sits 18.5% down from its top. On
   * short screens the gallery drops just enough to keep its top in view
   * (it is about 0.9x as tall as it is wide).
   */
  .wall-art {
    --stage-pad: clamp(10px, 2.5vh, 26px);
    position: absolute;
    right: clamp(36px, 5vw, 80px);
    top: max(
      calc(var(--stage-pad) + var(--art-w) * 0.45 + 6px),
      calc(var(--stage-pad) + (100% - var(--stage-pad) - var(--floor-h) * 0.45 - 14px) * 0.185)
    );
    translate: 0 -50%;
  }

  /* Title card on the wall, left of the fridge. */
  .wall-intro {
    --ink-soft: rgba(46, 36, 22, 0.62);
    --count: #c23616;
    position: absolute;
    left: clamp(24px, 4vw, 72px);
    top: 50%;
    translate: 0 -50%;
  }
  :global([data-theme='dark']) .wall-intro {
    --ink: #eceae6;
    --ink-soft: rgba(236, 234, 230, 0.6);
    --count: #ff7d6e;
    color: var(--ink);
  }
  .title {
    margin: 0;
    font-family: 'Mansalva', cursive;
    font-weight: 400;
    font-size: clamp(48px, 7vw, 104px);
    line-height: 1;
    display: flex;
    align-items: baseline;
    gap: 0.12em;
    font-variant-numeric: tabular-nums;
  }
  .wall-intro .tool {
    border-color: var(--ink-soft);
  }
  .tagline {
    margin: 10px 0 0;
    font-size: clamp(17px, 1.6vw, 22px);
    line-height: 1.3;
  }
  .wall-intro .tools {
    margin-top: 18px;
  }

  /*
   * The switch sits low on the wall, right of the fridge, under the art. On the
   * map the camera has moved but the switch hasn't, so it lands over the map's
   * bottom right corner (the Atlantic); the list button joins it there.
   */
  .page-controls {
    position: absolute;
    bottom: calc(var(--floor-h) * 0.45 + 30px);
    right: clamp(16px, 3vw, 40px);
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .magnets {
    position: absolute;
    inset: 0;
  }

  /* Reduced motion: the camera cuts straight to the map and back. */
  @media (prefers-reduced-motion: reduce) {
    .thumb {
      transition: none;
    }
    .stage {
      transition: none;
    }
  }

  /* Phones: the back link sits on the freezer, so the counter drops below it. */
  @media (max-width: 700px) {
    .freezer {
      padding-top: 46px;
    }
  }

  /* Name tag shown above a hovered magnet or empty map slot. Sizes are in
     screen pixels: `--cam` is the camera scale the door is seen at. */
  .scene :global(.fridge-tag) {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 5;
    pointer-events: none;
    white-space: nowrap;
    font-size: calc(15px / var(--cam, 1));
    padding: calc(3px / var(--cam, 1)) calc(10px / var(--cam, 1));
    border-radius: calc(6px / var(--cam, 1));
    background: var(--tag-bg);
    color: var(--tag-ink);
    box-shadow: 0 calc(3px / var(--cam, 1)) calc(10px / var(--cam, 1)) rgba(0, 0, 0, 0.18);
  }
</style>
