# Caden's Graduation Scrollytelling — Design

**Status:** draft
**Date:** 2026-05-02
**Target ship:** 2026-05-03 (graduation day)
**Author:** Slesa
**Tone:** jokey, hand-drawn, MS-Paint-grade animation. Looking polished is a non-goal; looking *fun* is the only goal.

## Goal

A single fullscreen scrollytelling post celebrating Caden's masters in CS at UAH. Plays as both:
- **Scroll-driven** — user scrolls; sections trigger
- **Autoplay** — `▶ play` button advances steps automatically; user scroll cancels autoplay

The post takes the reader through three acts:
1. **The Promotion** — silly intro skits about Caden becoming a "master"
2. **Voices From Around the World** — videos from friends/family pinned to a world map, with the camera flying between locations
3. **Home, At Last** — surprise-party ending + post-credits blooper reel

## Non-goals

- Real mapbox / google-maps fly-to. We use a static SVG world map with CSS transforms. Cheap, ships tonight.
- Polished motion design. Stick-figure-energy animations are correct, not a compromise.
- Mobile parity with desktop. Mobile is supported (vertical stack, like existing scrollytelling components) but the magic is desktop.
- Internationalization, accessibility audits beyond reasonable defaults. This is a one-shot personal post.

## Architecture

### Files added

```
src/
  components/
    GradScrollytelling.svelte          # the whole thing
  content/posts/
    caden-grad.mdx                     # frontmatter + steps array + component mount
public/
  videos/CHG Videos/                   # already exists; will be compressed in place
  videos/CHG Videos/bloopers/          # already exists; will be compressed in place
  images/
    caden.jpg                          # already exists; intro skit canvas
    caden2.jpg                         # already exists; "flying colors" canvas
    world-map.svg                      # NEW; open-license simplified world outline
scripts/
  compress-grad-videos.sh              # NEW; one-shot ffmpeg pipeline
```

No new npm dependencies. Uses existing svelte/astro stack.

### One component, one steps array

The post is driven by a `steps[]` array passed from the MDX file. `GradScrollytelling.svelte` is modeled after `BigfootScrollytelling.svelte`:

- Visual side is **sticky on the left** (3fr); story side **scrolls on the right** (2fr)
- Each step in the array becomes a `.step` section in the story side
- An `IntersectionObserver` watches `.step` sections; the active index drives what the visual side renders
- A vertical progress bar + `NN / TOTAL` indicator mirror the existing components

### Step kinds

Each step has a `kind` field that determines what the visual side renders:

```ts
type Step =
  | IntroSkitStep      // Caden photo + cap/gown/degree overlays
  | LateNightsStep     // Caden photo + tear overlays + rotating "exam" speech bubble
  | FlyingColorsStep   // Caden photo + winged color squares flying across
  | MapIntroStep       // world map at full zoom, no video
  | VideoStep          // world map zoomed to a coordinate + video player overlay
  | EndingStep         // text/image card for the surprise party
  | OuttakesStep       // blooper reel composite
```

Common fields: `caption` (markdown bubble text on the right), `duration` (autoplay ms; or `'video-end'`).

### Visual side state machine

```
┌──────────────────┐
│ kind = intro-*   │ → render <CadenPhotoStage> with overlay variants
│ kind = flying-*  │
└──────────────────┘
┌──────────────────┐
│ kind = map-intro │ → render <WorldMap> at world-view transform
│ kind = video     │ → render <WorldMap> at step's transform + <VideoPlayer>
└──────────────────┘
┌──────────────────┐
│ kind = ending    │ → render <PartyCard> placeholder (or photo, swapped tomorrow)
│ kind = outtakes  │ → render <BlooperReel>
└──────────────────┘
```

The visual side is a stack of `position:absolute` panels; each panel has `opacity: 0` except the one matching the active step's kind. Crossfade between kinds via CSS opacity transition.

The world-map panel persists across `map-intro` and all `video` steps — its CSS transform changes per step so the "fly" feels continuous instead of cross-fading.

### Autoplay state machine

```
[idle] --click ▶--> [playing] --user wheel/touch--> [paused]
[playing] --step done--> [advance to next step]
[playing] --last step--> [done] (button becomes "↻ replay")
[paused] --click ▶--> [playing]
```

Implementation detail:
- One `setTimeout` (not `setInterval`) per step. When step starts, set timeout for that step's `duration`. On expiry, `scrollIntoView({ behavior: 'smooth' })` to next step's section.
- For video steps: timeout = video element's `onended` event, with a 25s fallback timer in case a video errors.
- User scroll listener cancels autoplay (single `wheel` / `touchstart` handler). Does NOT auto-resume.

## Step-by-step content plan

Acts 1 and 3 are largely fixed. Act 2 is data-driven from the videos that exist on disk.

### Act 1: The Promotion (7 steps)

| # | kind | caption (right side) | visual (left side) | duration |
|---|------|----------------------|---------------------|----------|
| 1 | intro-greeting | "**hey caden!** 🎓" | caden.jpg, no overlays | 4s |
| 2 | intro-skit-cap | "you've been promoted from *bachelor* to **master**." | caden.jpg + animated cap drops onto head | 5s |
| 3 | intro-skit-gown | "ceremonial robe, just for you." | + gown emoji/PNG fades in over body | 4s |
| 4 | intro-skit-degree | "and a degree so heavy you can barely hold it." | + giant framed degree slides in from bottom, slight wobble | 5s |
| 5 | late-nights | "you've gone through many late nights, sweat, and tears to get here…" | swap to crying-overlay version of caden.jpg + speech bubble cycling through "ahhh I'm gonna fail!!! (Algorithms)", "ahhh I'm gonna fail!!! (OS)", "ahhh I'm gonna fail!!! (Compilers)", "...every single exam" | 8s (longest of the act; bubble cycles every 1.6s) |
| 6 | flying-colors | "but you passed with **flying colors.**" | caden2.jpg + 6–8 colored squares with wing emojis flapping across screen | 5s |
| 7 | map-intro | "here's what your friends have to say. **from all around the world.**" | world map appears at full-world zoom | 4s |

### Act 2: Voices From Around the World (data-driven)

Source data — list of video files in `public/videos/CHG Videos/`:

```
Angela.mp4
Ben.mov
Blaine&Ramona.mp4
BrandonDang.mov
Chase.MOV          → Saudi Arabia (confirmed)
Dad.mp4
Liesl.mov
Mamu&Daddy.mp4     → likely Nepal (Mamu = Nepali for maternal uncle)
Mom&Addison.mp4
Saam.mp4
```

Each video becomes a `VideoStep` with shape:

```js
{
  kind: 'video',
  name: 'Chase',
  location: 'Riyadh, Saudi Arabia',
  coords: [46.6753, 24.7136],   // [lng, lat], used to compute map transform
  src: '/videos/CHG Videos/Chase.MOV',
  caption: '**chase** — riyadh, saudi arabia.',
  duration: 'video-end',         // autoplay waits for video.onended
}
```

> **OPEN ITEM (must fill before implementation):** Slesa to confirm the location for each name. Placeholder mapping in the implementation will use ⚠️ TBD coords until confirmed. The "fly" sequence order should also be chosen to feel like a coherent journey (e.g., farthest-from-home → closer-to-home, ending naturally at the surprise party in Huntsville, AL).

#### Map "fly" mechanics

- World map is a static SVG (open-license, e.g., simplified Natural Earth) at `public/images/world-map.svg`.
- The map container has `overflow: hidden`. The map itself is `position: absolute` with `transform: translate(...) scale(...)`.
- Each video step computes a target `translate + scale` from its `coords` so the target city sits in the visible center of the panel at ~6x zoom.
- CSS `transition: transform 1.8s ease-in-out` produces the "fly" effect — the same panel re-positions instead of fading.
- A small location pin (`📍`) and the person's name caption animate in once the transform completes.

#### Video player overlay

- During a video step, a `<video>` element appears as a fixed-size, slightly rotated card overlaid on the map ("polaroid" feel).
- `autoplay` muted on enter (browser policy), with an unmute toggle pinned to the corner.
- On `ended`, autoplay advances. Manual scroll also advances, cutting the video.
- Only the currently-active video element is mounted (others are unmounted to avoid memory bloat with 10 videos).

#### Inline ambient bloopers (placement #1)

- A tiny secondary `<video>` element is pinned to the bottom-right corner during the **entire Act 2** as a picture-in-picture loop.
- Cycles through the 4 blooper files in `public/videos/CHG Videos/bloopers/`. Muted, looping, 240×180px, slight tilt.
- Source: `Mamu&DaddyBloopers.mp4`, `Mamu&DaddyBloopers1.mp4`, `Mamu&DaddyBloopers2.mp4`, `Mom&Addison2.mp4`.
- Pauses when the main video plays (avoids audio overlap is moot since main is muted by default, but optical clutter — the corner clip dims to 30% opacity while a main video plays).

### Act 3: Home, At Last (3 steps)

| # | kind | caption | visual | duration |
|---|------|---------|--------|----------|
| N | map-home | "and after every trip, back here. **huntsville.**" | map flies to Huntsville at street-level zoom | 4s |
| N+1 | ending | "🎉 the surprise party — 'congratulations caden!!!'" | placeholder card tonight; swap in `public/images/party.jpg` tomorrow morning | 6s |
| N+2 | outtakes | "and now — **the outtakes.**" | full-screen blooper reel: the 4 blooper clips played end-to-end, autoplay, then a final "fin." card | until clips end (~30s) |

The placeholder card is a centered text card with hand-drawn style ("PARTY PHOTO — DROP IN AFTER GRADUATION 🎉"). MDX has a clearly-marked comment showing exactly which line to swap.

## Data shape (steps array)

The `caden-grad.mdx` file declares the steps inline, like `bigfoot.mdx` does. Schema:

```ts
type Step = {
  kind: 'intro-greeting' | 'intro-skit-cap' | 'intro-skit-gown' | 'intro-skit-degree'
       | 'late-nights' | 'flying-colors'
       | 'map-intro' | 'video' | 'map-home'
       | 'ending' | 'outtakes';
  caption: string;                 // markdown-inline
  duration: number | 'video-end';  // ms, or 'video-end' for video kind

  // for late-nights:
  examBubbles?: string[];          // rotating speech-bubble texts

  // for video / map-home:
  name?: string;
  location?: string;
  coords?: [number, number];       // [lng, lat]
  src?: string;                    // video path

  // for ending:
  swapImageHint?: string;          // comment-only; helps the swap
};
```

## Animation inventory

All CSS keyframes — no JS animation libraries, no SVG morphing.

| name | trigger | description |
|------|---------|-------------|
| `cap-drop` | step 2 active | translateY(-200%) → final position over head, with a slight bounce |
| `gown-fade` | step 3 active | opacity 0→1, scaleY 0.8→1 from waist down |
| `degree-thud` | step 4 active | translateY(150%) → rest, with a 4° rotation jiggle |
| `tear-drip` | step 5 active | two `💧` divs translate from eye region downward, looping |
| `bubble-flicker` | step 5 active | speech bubble fades opacity to swap exam name |
| `wing-flap` | step 6 active | colored squares with `🪽` either side, translateX from off-screen left → off-screen right with sinusoidal Y |
| `map-fly` | every map step | `transform` change with `transition: transform 1.8s ease-in-out` |
| `pin-bob` | video step active | `📍` does the same `marker-bob` animation already defined in existing components |

We borrow the `marker-bob` keyframes from `BigfootScrollytelling.svelte` so the visual language is consistent.

## Asset pipeline

### Video compression script

`scripts/compress-grad-videos.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
SRC="public/videos/CHG Videos"
TMP="$SRC/.compressed"
mkdir -p "$TMP" "$TMP/bloopers"

compress() {
  local in="$1" out="$2"
  ffmpeg -y -i "$in" \
    -vf "scale='min(1280,iw)':-2" \
    -c:v libx264 -preset medium -crf 26 \
    -c:a aac -b:a 96k -movflags +faststart \
    "$out"
}

for f in "$SRC"/*.{mp4,mov,MOV}; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f")"
  out="$TMP/${base%.*}.mp4"
  compress "$f" "$out"
done

for f in "$SRC"/bloopers/*.{mp4,mov,MOV}; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f")"
  out="$TMP/bloopers/${base%.*}.mp4"
  compress "$f" "$out"
done

# Move originals out, replace with compressed
mkdir -p "$SRC/.originals"
mv "$SRC"/*.{mp4,mov,MOV} "$SRC/.originals/" 2>/dev/null || true
mv "$SRC"/bloopers/*.{mp4,mov,MOV} "$SRC/.originals/" 2>/dev/null || true
mv "$TMP"/*.mp4 "$SRC/"
mv "$TMP"/bloopers/*.mp4 "$SRC"/bloopers/
rmdir "$TMP/bloopers" "$TMP"
```

- Targets ~5–10MB per video (1280px wide max, CRF 26, faststart)
- Originals go to `.originals/` (already gitignored implicitly via .gitignore line we'll add)
- Final filenames are all `.mp4` (uppercase `.MOV` becomes `.mp4`)
- Add `public/videos/CHG Videos/.originals/` to `.gitignore`

### `.gitignore` addition

```
public/videos/CHG Videos/.originals/
```

### World map asset

Use a public-domain simplified SVG world map (e.g., from `world-110m.json` simplified, or a single-color outline SVG). Saved as `public/images/world-map.svg`. ~50KB.

> **OPEN ITEM:** pick the exact SVG source during implementation. Default plan: download a single CC0 world outline SVG.

## MDX file structure

`src/content/posts/caden-grad.mdx`:

```mdx
---
title: caden, master of computer science
date: 2026-05-03
category: misc
excerpt: a love letter, scroll through it.
fullscreen: true
---

import GradScrollytelling from '../../components/GradScrollytelling.svelte';

<GradScrollytelling
  client:load
  cadenPhoto="/images/caden.jpg"
  cadenTriumphantPhoto="/images/caden2.jpg"
  worldMap="/images/world-map.svg"
  steps={[
    { kind: 'intro-greeting', caption: '**hey caden!** 🎓', duration: 4000 },
    { kind: 'intro-skit-cap', caption: "you've been promoted from *bachelor* to **master**.", duration: 5000 },
    /* ...rest of acts 1, 2, 3... */
  ]}
/>
```

## Mobile

Follow existing scrollytelling components: at `max-width: 780px`, grid collapses to single column, visual side becomes 65vh sticky top, story side stacks below. Map fly transforms work the same. Videos reflow to fit the narrower visual side.

## Testing & verification

This is a creative/visual post — automated tests aren't useful. Verification is **manual, with the dev server in a real browser**, on the golden path:

- Scroll through every step end-to-end, watch each animation fire
- Click ▶ play; verify it auto-advances; verify a wheel cancels it
- Verify each video plays, including the inline blooper PiP
- Verify mobile breakpoint (resize to <780px)
- Verify the back-link works (uses `data-post-category` / `referrer` like existing components)
- Verify dark/light theme toggle (post inherits `var(--bg-color)` etc.)
- After tomorrow's swap: verify the party photo replacement loads

Type-checking (`astro check`) and existing build (`npm run build`) must pass.

## Risks & cuts

| Risk | Mitigation / cut |
|------|-------------------|
| 10+ videos take long to load | `preload="metadata"` only on the active video; others unmounted |
| Animations look amateurish | **That is the goal.** Lean into MS Paint vibes. |
| Map SVG licensing | Use a CC0 source; commit attribution in the post bottom if needed |
| Surprise party photo not ready in time | Placeholder card is the fallback — no blocker |
| ffmpeg not installed | Surface error early in compress script with a clear `brew install ffmpeg` hint |
| Autoplay audio policy blocks | All videos start `muted`; unmute is a manual toggle on the active video |
| Step durations feel wrong on first watch | Tunable in steps array; expect 2-3 passes after first end-to-end watch |

## Open items (to fill before / during implementation)

1. **Location-per-name mapping.** Slesa to confirm: Angela, Ben, Blaine&Ramona, Brandon Dang, Dad, Liesl, Mom&Addison, Saam → which city/country each? (Chase = Saudi Arabia confirmed; Mamu&Daddy = Nepal assumed.)
2. **Order of map fly-throughs.** Default suggestion: farthest-from-Huntsville → closest, ending naturally on Huntsville. Slesa to confirm or override.
3. **Exam names** in the late-nights speech bubble (best if real classes Caden took: Algorithms? OS? Compilers? Networking?)
4. **World map SVG source.** Pick a CC0 outline during implementation.
5. **Surprise party photo** drop-in tomorrow morning — confirmed swap point in MDX.

## Parking lot (deferred polish)

See `docs/caden-grad-extras-parking-lot.md` for silly extras (achievement-unlocked toasts, panic-attack tally, tuition-paid stamp, credits roll). These are bonus-only — pulled in only if base post ships with time to spare.
