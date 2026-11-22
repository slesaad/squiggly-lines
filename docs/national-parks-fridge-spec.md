# National Parks Fridge Magnets: Revised Spec

A fullscreen post on squiggly-lines showing my national park magnet collection on a
refrigerator door. A "Magic Toggle" glides the magnets between a draggable fridge
layout and their real locations on a US map. Grows over time toward all 63 parks.

Supersedes `squiggly-lines/national_parks_fridge_magnet_visualizer_spec.md` (Gemini draft).

---

## 1. Fit with the blog

- **Post:** `src/content/posts/national-park-magnets.mdx`, frontmatter `fullscreen: true`,
  `category: misc` (or `make`). Mounts one island: `<ParkFridge client:load ... />`.
- **Component:** `src/components/ParkFridge.svelte` (Svelte 5 runes), split into
  `src/components/park-fridge/` subcomponents if it grows past ~400 lines.
- **Animation:** `spring` / `tweened` from `svelte/motion`. No framer-motion.
- **Drag:** hand-rolled pointer events (`pointerdown/move/up` + `setPointerCapture`).
- **Styling:** scoped plain CSS in Svelte (no SCSS preprocessor for Svelte here) + existing CSS custom properties; respects dark/light theme.
  The fridge is a tall, rounded, glossy retro enamel fridge (Smeg-like proportions,
  no real branding): small freezer door on top, main door below, vertical chrome
  handles on the right, chrome feet, a chrome script nameplate. Pastel orange
  enamel. Light/dark theme changes the kitchen around it.
- **Icons:** inline SVG. No icon library.
- **Asset URLs:** always prefixed with `import.meta.env.BASE_URL` (GitHub Pages).
- **New dependencies:** `d3-geo`, `topojson-client`, `us-atlas`, `d3-force`, used
  **only in a build-time script**, so they are devDependencies and never ship to the browser.
  Exception: `d3-force` runs client-side (small) unless the map layout is precomputed
  for a fixed pin size (decide during implementation; prefer precompute).

## 2. Data

`src/data/parks.ts` lists **all 63 national parks**. A park with no `visits` is an
unvisited empty slot.

```ts
export interface Park {
  id: string;                    // "arches"
  name: string;                  // "Arches"
  state: string;                 // "UT"
  coordinates: [number, number]; // [lng, lat]
  visits?: Visit[];              // absent/empty = not visited yet
  magnet?: {
    image?: string;              // "/magnets/arches.png"; omitted = placeholder SVG
    color?: string;              // placeholder fill + pin ring color
    scale?: number;              // relative size, default 1
  };
  mapNudge?: { dx: number; dy: number };                  // manual override, map units
}

export interface Visit {
  date: string;      // "2024-10" (ISO year-month, sortable)
  note: string;      // short, 1-3 sentences
  photo: VisitPhoto | VisitPhoto[]; // { url, video?, caption? }; several stack in the trip log
}
```

Adding a park = fill in `visits` + drop `public/magnets/<id>.png` and
`public/photos/<id>.jpg`. Nothing else.

**Generated data** (`scripts/build-park-map.mjs`, committed output):
- `src/data/us-outline.ts`: SVG path string(s) for the nation + state borders,
  projected with `geoAlbersUsa` into a 975×610 viewBox (from `states-albers-10m.json`).
- `src/data/park-map-positions.ts`: projected `[x, y]` per park id in the same space,
  plus collision-separated pin positions.
- Rerun the script when a park is added (or when pin size changes).

## 3. Layout & coordinate spaces

Two spaces, converted to screen px at render time:

| Mode | Space | Stored as |
|---|---|---|
| Fridge | area a magnet center can occupy | `fridge-layout.ts` x/y in 0..1 |
| Map | Albers viewBox 975×610 | projected coords |

- **Door:** full viewport, with a metallic handle on the right edge (desktop) or top
  edge (phone). Toolbar is mounted on the handle.
- **Map placement:** scaled to fit the door width (minus padding), centered vertically
  on desktop, top-third on phones. Alaska/Hawaii insets get faint dashed boxes.

### Fridge auto-layout
- Visited parks with a spot in `src/data/fridge-layout.ts` (per form factor): use it.
- Visited parks without one: placed by a deterministic packer (seeded by park id) into
  free space, rotation in [-4°, +4°]. Same result every load.
- Unvisited parks: not shown in fridge mode.

## 4. Magnets

- Every magnet is a cut-out photo (`npm run extract:magnets`), drawn with molded
  thickness: darkened copies of the cut-out below and to the right, plus a sheen.
- **Shadow:** `filter: drop-shadow(...)`, small at rest; larger + offset while lifted
  (dragging) and on hover. Scale 1.05 + rotation eases toward 0 on hover.
- **Label:** park name + year on hover/focus (desktop) or during press (touch).
- **Accessibility:** each magnet is a `<button>` with an aria-label
  ("Arches National Park, visited October 2024"). Arrow keys nudge a focused magnet in
  fridge mode. Enter opens the trip log.

## 5. The Magic Toggle (map on the door)

A chrome lever switch on the wall: `FRIDGE` ↔ `MAP`. Desktop/tablet only
(scene ≥ 760px wide); phones get fridge mode only. The fridge never opens: the
map is a paper road map stuck to the door, held on by the magnets themselves.

**→ MAP** (~1s, one continuous move; only transforms and opacity animate)
1. A road map folded in half appears on the door (left of the handle) and its bottom
   half swings down from the crease.
2. At the same time the camera moves in on the door until the paper fills the screen.
3. Each magnet lifts off its fridge spot and glides onto its park (CSS transition,
   staggered west to east by transition delays),
   shrinking to its pin size in the collision layout, with a slight hand-placed tilt.
   The paper carries the outline, leader lines, empty slots and the printed
   "16 / 63 national parks" title.

**→ FRIDGE**: the camera pulls back while the magnets slide home (east to west) and
the map folds away. `Esc` also returns.

- The magnets are the map pins: clicking one opens its trip log; hover/focus
  straightens it and shows its name tag.
- Everything on the paper is laid out in door pixels; strokes, type, tags and shadows
  are divided by the camera scale so they read at normal on-screen sizes.
- `prefers-reduced-motion`: the camera cuts straight in and out; no unfold or slide.

## 6. Interaction details

- **Click vs drag:** pointer moves less than 4px between down and up = click.
- **Drop:** short "snap" settle (scale 1.03 → 1, shadow shrinks).
- **Persistence:** reader's dragged positions saved to `localStorage`
  (`park-fridge:positions:v2`), wrapped in try/catch. "Reset" clears them and springs
  back to the author layout.
- **Author mode:** `?arrange` in the URL shows a "copy layout" button that copies the
  spots as an object literal to paste over `fridgeLayout` in `src/data/fridge-layout.ts`.
  Parks without a hand-placed spot are auto-placed into free space.

## 7. Empty slots (unvisited parks)

- Map mode only. Dashed ring at the park location, theme-muted color.
- Hover/tap shows a small tag: **"Glacier: next up?"** (park name + state).
- Not focusable in tab order by default (63 stops is too many); reachable via the list view.

## 8. Progress counter

Fixed to the door near the toggle: a small scoreboard-style counter **"16 / 63"**
that counts up when the post loads. In map mode the label reads "parks collected."

## 9. Trip log (modal)

One keepsake card per park:
- Left/top: the magnet (large), park name, state, coordinates in small type, visit date.
- Right/bottom: one Polaroid (photo + handwritten-font caption), held by a small round
  colored magnet; the note below it.
- Multiple visits or photos: extra Polaroids stacked behind, tap to cycle.
- A photo can be a short video (muted loop, poster frame as `url`); paused with controls under reduced motion.
- Phone: bottom sheet. Desktop: centered card. Esc / backdrop / close button dismisses.
  Focus is trapped while open and returns to the magnet on close.
- Photo loads lazily when the modal opens.

## 10. Controls

- **On the wall, low on the right (outside the fridge):** the Magic Toggle (desktop/tablet
  only): a paper card with a small round magnet that slides along a dashed road between
  "fridge" and "map". It stays in the same screen spot in both views; on the map a "list"
  button sits beside it.
- **Wall art:** a small framed gallery right of the fridge, hung at eye level (center
  about 57" up, scaled against the ~70" fridge), dropping only as far as needed to stay
  on short screens. Desktop/tablet only.
- **On the freezer door:** list, reset (and "copy layout" in `?arrange` mode).

**Out of scope for v1:** filters, presets beyond Reset, audio, 3D tilt, lightbox,
road-trip threads, pan/zoom.

## 11. Phone behavior

- The fridge fills the screen; counter, list and reset sit on the freezer.
- Fridge mode only (no map switch); the list view is the way to browse all parks.
- Magnets sized ~24% of door width; drag with touch (`touch-action: none` on magnets).
- Trip log opens as a bottom sheet.

## 12. Milestones

1. **Data + build script:** `parks.ts` with all 63 parks (coordinates, state, glyph,
   color), visited flags for my 16; `build-park-map.mjs` producing outline + positions.
2. **Door + map render:** textured door, handle, outline SVG in a scaled viewBox,
   static pins at projected positions. Verify Utah/California separation and the
   Hawaii inset.
3. **Placeholder magnets + fridge mode:** SVG magnets, auto-layout, drag, click-vs-drag,
   localStorage, Reset, author `?arrange` mode.
4. **Magic Toggle:** magnet → pin morph, spring glide, outline + empty slots fade,
   reduced motion.
5. **Trip log modal + list view + counter.**
6. **Phone pass + theme pass**, then real photos/notes.

## Visited parks (16)

| id | Park | State |
|---|---|---|
| arches | Arches | UT |
| biscayne | Biscayne | FL |
| bryce-canyon | Bryce Canyon | UT |
| canyonlands | Canyonlands | UT |
| capitol-reef | Capitol Reef | UT |
| death-valley | Death Valley | CA/NV |
| everglades | Everglades | FL |
| grand-canyon | Grand Canyon | AZ |
| great-smoky-mountains | Great Smoky Mountains | TN/NC |
| hawaii-volcanoes | Hawaiʻi Volcanoes | HI |
| kings-canyon | Kings Canyon | CA |
| mammoth-cave | Mammoth Cave | KY |
| rocky-mountain | Rocky Mountain | CO |
| sequoia | Sequoia | CA |
| yosemite | Yosemite | CA |
| zion | Zion | UT |

Dense clusters to verify in milestone 2: Utah (Arches, Canyonlands, Capitol Reef, Bryce,
Zion), Sequoia + Kings Canyon (adjacent, nearly the same point), and South Florida
(Everglades + Biscayne).

## Post
- Title: **16 / 63** (bump the count as parks are added)
- Slug: `national-park-magnets` (stable as the count changes)

## Open items
- Replace the five downloaded product shots (Biscayne, Death Valley, Kings Canyon,
  Rocky Mountain, Sequoia) with photos of the real magnets.
