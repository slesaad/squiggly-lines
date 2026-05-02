# Caden's Graduation Scrollytelling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fullscreen scroll-driven + autoplayable celebration post for Caden's CS masters at UAH, with intro skits, video messages from friends pinned to a world map with fly-to transforms, a surprise-party ending, and a post-credits blooper reel.

**Architecture:** One Svelte component (`GradScrollytelling.svelte`) modeled after `src/components/BigfootScrollytelling.svelte`, driven by a `steps[]` array passed from `caden-grad.mdx`. Each step has a `kind` field that determines what the sticky visual panel renders (Caden photo with overlay animations / world map with fly-to + video player / party card / blooper reel). Scroll position drives an active step index via `IntersectionObserver`; an autoplay button advances by `scrollIntoView` on a per-step timer.

**Tech Stack:** Astro 5, Svelte 5 (runes — `$state`, `$effect`, `$derived`), MDX. No new npm dependencies. ffmpeg for asset compression (script written; execution deferred until pre-deploy).

**TDD note:** This codebase has no test infrastructure (no test runner in `package.json`, no test files anywhere). The work is heavily visual. Each task's verification gate is **manual browser testing** — start `npm run dev` (which the user will normally already have running), navigate to `http://localhost:4321/squiggly-lines/posts/caden-grad/`, observe the specific behavior described. This is the test that has to pass. Don't bootstrap a test framework; that's out of scope for tight ship-tomorrow constraints.

**Reference companion components:**
- `src/components/BigfootScrollytelling.svelte` — the closest template; copy its scroll observer, progress bar, back-link, theme integration patterns
- `src/components/Scrollytelling.svelte` — generic image-stack scrollytelling; copy its `mdInline` / `stripMd` helpers verbatim

**Spec:** `docs/superpowers/specs/2026-05-02-caden-grad-scrollytelling-design.md`

---

## File Structure

| Path | Status | Responsibility |
|------|--------|-----------------|
| `scripts/compress-grad-videos.sh` | NEW | One-shot ffmpeg pipeline. Written but **not executed** until pre-deploy. |
| `.gitignore` | MODIFY | Add `public/videos/CHG Videos/.originals/` |
| `public/images/world-map.svg` | NEW | CC0 simplified world outline. Equirectangular projection assumed. |
| `src/components/GradScrollytelling.svelte` | NEW | The whole component — layout, scroll observer, kind-based visual panels, autoplay state machine, all CSS animations. |
| `src/content/posts/caden-grad.mdx` | NEW | Frontmatter (`fullscreen: true`, `category: misc`) + `steps[]` array + component mount. |

**No tests added** (no test infrastructure exists; verification is manual).

---

## Task 1: Asset prep — compression script + gitignore

**Files:**
- Create: `scripts/compress-grad-videos.sh`
- Modify: `.gitignore`

- [ ] **Step 1: Create `scripts/compress-grad-videos.sh`**

```bash
#!/usr/bin/env bash
# Compresses every .mp4/.mov/.MOV in public/videos/CHG Videos/ (and bloopers/)
# in place. Originals are moved to .originals/ (gitignored) so they're
# recoverable but never deployed.
#
# Run only when ready to push/deploy. Requires ffmpeg (brew install ffmpeg).
set -euo pipefail

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found. Install with: brew install ffmpeg" >&2
  exit 1
fi

SRC="public/videos/CHG Videos"
TMP="$SRC/.compressed"
ORIG="$SRC/.originals"
mkdir -p "$TMP" "$TMP/bloopers" "$ORIG" "$ORIG/bloopers"

compress() {
  local in="$1" out="$2"
  echo "→ $in"
  ffmpeg -y -hide_banner -loglevel warning -i "$in" \
    -vf "scale='min(1280,iw)':-2" \
    -c:v libx264 -preset medium -crf 26 \
    -c:a aac -b:a 96k -movflags +faststart \
    "$out"
}

shopt -s nullglob nocaseglob
for f in "$SRC"/*.{mp4,mov}; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f")"
  out="$TMP/${base%.*}.mp4"
  compress "$f" "$out"
done

for f in "$SRC"/bloopers/*.{mp4,mov}; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f")"
  out="$TMP/bloopers/${base%.*}.mp4"
  compress "$f" "$out"
done
shopt -u nullglob nocaseglob

# Move originals aside
mv "$SRC"/*.{mp4,mov,MOV} "$ORIG"/ 2>/dev/null || true
mv "$SRC"/bloopers/*.{mp4,mov,MOV} "$ORIG"/bloopers/ 2>/dev/null || true

# Promote compressed
mv "$TMP"/*.mp4 "$SRC"/
mv "$TMP"/bloopers/*.mp4 "$SRC"/bloopers/
rmdir "$TMP/bloopers" "$TMP"

echo "Done. Originals preserved in $ORIG/"
```

- [ ] **Step 2: `chmod +x` the script**

```bash
chmod +x scripts/compress-grad-videos.sh
```

- [ ] **Step 3: Add gitignore entry**

Append to `.gitignore`:

```
# Compressed video originals (kept locally, never deployed)
public/videos/CHG Videos/.originals/
```

- [ ] **Step 4: Verify script syntax (don't run compression)**

```bash
bash -n scripts/compress-grad-videos.sh
echo "Exit: $?"
```
Expected: exit 0, no syntax errors.

- [ ] **Step 5: Commit**

```bash
git add scripts/compress-grad-videos.sh .gitignore
git commit -m "Add deferred grad-video compression script"
```

---

## Task 2: World map SVG asset

**Files:**
- Create: `public/images/world-map.svg`

- [ ] **Step 1: Source a CC0 world outline SVG**

Use a simple equirectangular SVG. A reliable lightweight option: a single-color outline of all countries from the open-license `world-110m` data. Save the SVG to `public/images/world-map.svg`. The file should:
- Use `viewBox="0 0 1000 500"` (or any 2:1 box — equirectangular projection has aspect 2:1)
- Have a `currentColor` fill so it inherits theme color
- Be under ~200KB

If the engineer doesn't have an SVG handy, pull one from a CC0 source (e.g., Wikimedia Commons "BlankMap-World" series, or `simplemaps`'s free outlines). Strip metadata, set `fill="currentColor"`.

**Acceptable fallback during development:** a placeholder `<svg viewBox="0 0 1000 500"><rect width="1000" height="500" fill="currentColor" opacity="0.1"/><text x="500" y="250" text-anchor="middle" fill="currentColor">WORLD MAP PLACEHOLDER</text></svg>` so layout/transform work can proceed in parallel. Replace with real SVG before final commit.

- [ ] **Step 2: Verify the SVG renders**

Open `public/images/world-map.svg` directly in a browser. It should render without errors.

- [ ] **Step 3: Commit**

```bash
git add public/images/world-map.svg
git commit -m "Add world map SVG for grad scrollytelling"
```

---

## Task 3: Skeleton component, post stub, two-column layout, scroll engine

**Files:**
- Create: `src/components/GradScrollytelling.svelte`
- Create: `src/content/posts/caden-grad.mdx`

This task gets the post wired up and reachable in the browser, with the bigfoot-style two-column sticky layout, scroll-driven step tracker, progress bar, and back-link. No content yet — just plumbing.

- [ ] **Step 1: Create the post stub**

Create `src/content/posts/caden-grad.mdx`:

```mdx
---
title: caden, master of computer science
date: 2026-05-03
category: misc
excerpt: a love letter, scroll through it.
fullscreen: true
draft: false
---

import GradScrollytelling from '../../components/GradScrollytelling.svelte';

<GradScrollytelling
  client:load
  cadenPhoto="/squiggly-lines/images/caden.jpg"
  cadenTriumphantPhoto="/squiggly-lines/images/caden2.jpg"
  worldMap="/squiggly-lines/images/world-map.svg"
  steps={[
    { kind: 'intro-greeting', caption: '**hey caden!** 🎓', duration: 4000 },
    { kind: 'intro-greeting', caption: 'just a placeholder step so the observer has 2 sections.', duration: 4000 },
  ]}
/>
```

(Two placeholder steps so `IntersectionObserver` has multiple sections to track during this scaffolding phase. Real steps fill in later tasks.)

- [ ] **Step 2: Create the component skeleton**

Create `src/components/GradScrollytelling.svelte`. Copy structure from `src/components/BigfootScrollytelling.svelte`, removing iframe/postMessage logic. Full file:

```svelte
<script>
  import { onMount } from 'svelte';

  let {
    cadenPhoto,
    cadenTriumphantPhoto,
    worldMap,
    steps = [],
  } = $props();

  let activeIndex = $state(0);
  let inView = $state(true);
  let rootEl;
  let storyEl;
  let backHref = $state('/');

  const base = import.meta.env.BASE_URL || '';

  function resolveBack(path) {
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    const baseWithSlash = base.endsWith('/') ? base : base + '/';
    return baseWithSlash + normalized;
  }

  function handleBack(e) {
    const ref = document.referrer;
    if (ref && new URL(ref).origin === window.location.origin && window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
  }

  function mdInline(text) {
    if (!text) return '';
    let s = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  onMount(() => {
    const categoryEl = rootEl.closest('[data-post-category]');
    const category = categoryEl?.dataset.postCategory;
    backHref = resolveBack(category ? `/${category}` : '/');

    const stepObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeIndex = Number(entry.target.dataset.index);
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    const sections = storyEl.querySelectorAll('.step');
    sections.forEach((s) => stepObserver.observe(s));

    const rootObserver = new IntersectionObserver(
      ([entry]) => { inView = entry.isIntersecting; },
      { threshold: 0 }
    );
    rootObserver.observe(rootEl);

    return () => {
      stepObserver.disconnect();
      rootObserver.disconnect();
    };
  });
</script>

<div class="scrollytelling" bind:this={rootEl}>
  <a class="back-link" class:hidden={!inView} href={backHref} onclick={handleBack}>&lt;&lt; go back</a>

  <div class="progress-indicator" class:hidden={!inView}>
    {String(activeIndex + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
  </div>

  <div class="progress-bar" class:hidden={!inView}>
    <div
      class="progress-bar-fill"
      style="height: {((activeIndex + 1) / steps.length) * 100}%"
    ></div>
  </div>

  <div class="grid">
    <div class="visual-side">
      <!-- Visual panels added in Task 4 -->
      <div class="debug-active">step {activeIndex + 1} / {steps.length} — kind: {steps[activeIndex]?.kind}</div>
    </div>

    <div class="story-side" bind:this={storyEl}>
      {#each steps as step, i}
        <section class="step" data-index={i} class:active={i === activeIndex}>
          <div class="bubble">
            <span class="step-num">{String(i + 1).padStart(2, '0')}</span>
            <p>{@html mdInline(step.caption)}</p>
          </div>
        </section>
      {/each}
    </div>
  </div>
</div>

<style>
  .scrollytelling {
    position: relative;
    background: var(--bg-color);
  }

  .back-link {
    position: fixed;
    top: 3rem;
    left: 1rem;
    z-index: 20;
    font-size: 14px;
    color: var(--accent-color);
    background: var(--bg-color);
    padding: 6px 12px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    text-decoration: none;
    transition: opacity 0.3s ease, transform 0.2s ease;
  }
  .back-link:hover {
    text-decoration: underline;
    transform: translateX(-2px);
  }

  .progress-indicator {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 20;
    font-size: 14px;
    color: var(--accent-color);
    background: var(--bg-color);
    padding: 6px 12px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    letter-spacing: 0.05em;
    transition: opacity 0.3s ease;
  }

  .progress-bar {
    position: fixed;
    top: 50%;
    right: 1rem;
    transform: translateY(-50%);
    width: 3px;
    height: 40vh;
    background: var(--border-color);
    border-radius: 2px;
    z-index: 20;
    overflow: hidden;
    transition: opacity 0.3s ease;
  }
  .progress-bar-fill {
    width: 100%;
    background: var(--accent-color);
    transition: height 0.4s ease;
  }

  .hidden {
    opacity: 0;
    pointer-events: none;
  }

  .grid {
    display: grid;
    grid-template-columns: 3fr 2fr;
  }

  .visual-side {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
    background: var(--bg-color);
  }

  .debug-active {
    position: absolute;
    top: 1rem;
    left: 1rem;
    color: var(--accent-color);
    font-size: 14px;
    font-family: monospace;
    background: var(--bg-color);
    padding: 4px 8px;
    border: 1px solid var(--border-color);
    border-radius: 3px;
    z-index: 5;
  }

  .story-side {
    padding: 0 3rem 0 2rem;
  }

  .step {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 2rem 0;
  }

  .bubble {
    background: var(--bg-color);
    border: 2px solid var(--border-color);
    border-radius: 10px;
    padding: 1.5rem 2rem;
    box-shadow: 3px 5px 14px rgba(0, 0, 0, 0.12);
    transform: rotate(-0.6deg);
    transition: transform 0.5s ease, opacity 0.5s ease, box-shadow 0.5s ease;
    opacity: 0.35;
    max-width: 460px;
  }

  .step:nth-child(even) .bubble { transform: rotate(0.5deg); }

  .step.active .bubble {
    opacity: 1;
    transform: rotate(0deg) scale(1.02);
    box-shadow: 4px 7px 18px rgba(0, 0, 0, 0.18);
  }

  .step-num {
    display: inline-block;
    font-size: 2.2rem;
    font-weight: bold;
    color: var(--accent-color);
    margin-right: 0.6rem;
    line-height: 1;
    vertical-align: middle;
  }

  .bubble p {
    display: inline;
    font-size: 1.3rem;
    color: var(--text-color);
    line-height: 1.5;
  }
  .bubble p :global(strong) {
    color: var(--accent-color);
    font-weight: bold;
  }
  .bubble p :global(em) { font-style: italic; }
  .bubble p :global(code) {
    font-family: system-ui, -apple-system, monospace;
    font-size: 0.95em;
    background: var(--border-color);
    padding: 1px 6px;
    border-radius: 3px;
  }
  .bubble p :global(a) {
    color: var(--link-color);
    border-bottom: 1px solid currentColor;
  }

  @media (max-width: 780px) {
    .grid { grid-template-columns: 1fr; }
    .visual-side { height: 65vh; position: sticky; top: 0; }
    .story-side { padding: 0 1.25rem; }
    .step { min-height: 65vh; }
    .bubble { max-width: 100%; }
    .progress-bar { height: 30vh; }
  }
</style>
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```
Expected: completes without errors. Astro/MDX picks up the new post.

- [ ] **Step 4: Browser verification**

Start dev server (`npm run dev` if not already running) and open `http://localhost:4321/squiggly-lines/posts/caden-grad/` in a browser. Verify:
- Page loads without errors
- Two-column layout: left side sticky, right side scrolls
- Two captions visible (from the placeholder steps)
- Scrolling triggers the active-step indicator (top-right shows `01 / 02` → `02 / 02`)
- Debug overlay shows `step 1 / 2 — kind: intro-greeting`
- Back-link visible top-left
- Progress bar fills as you scroll

- [ ] **Step 5: Commit**

```bash
git add src/components/GradScrollytelling.svelte src/content/posts/caden-grad.mdx
git commit -m "Add grad scrollytelling skeleton with scroll engine"
```

---

## Task 4: Visual-side kind-based panel stack

**Files:**
- Modify: `src/components/GradScrollytelling.svelte`

Replace the placeholder `debug-active` div with a stack of kind-keyed panels that crossfade based on active step's `kind`. Add empty containers for `photo-stage`, `world-map`, `party-card`, `outtakes-reel`. Each panel becomes visible only when its kind matches the active step.

- [ ] **Step 1: Add the kind→panel mapping**

In `GradScrollytelling.svelte`, inside `<script>`, add a derived helper after the `mdInline` function:

```js
const PHOTO_KINDS = new Set([
  'intro-greeting', 'intro-skit-cap', 'intro-skit-gown', 'intro-skit-degree',
  'late-nights', 'flying-colors',
]);
const MAP_KINDS = new Set(['map-intro', 'video', 'map-home']);
const ENDING_KINDS = new Set(['ending']);
const OUTTAKES_KINDS = new Set(['outtakes']);

const activeKind = $derived(steps[activeIndex]?.kind ?? 'intro-greeting');
const activePanel = $derived(
  PHOTO_KINDS.has(activeKind) ? 'photo'
  : MAP_KINDS.has(activeKind) ? 'map'
  : ENDING_KINDS.has(activeKind) ? 'ending'
  : OUTTAKES_KINDS.has(activeKind) ? 'outtakes'
  : 'photo'
);
```

- [ ] **Step 2: Replace the visual-side markup**

In the template, replace the `<div class="visual-side">` block (currently containing only `debug-active`) with:

```svelte
<div class="visual-side">
  <div class="panel" class:visible={activePanel === 'photo'}>
    <!-- Photo stage filled in Task 5 -->
    <div class="placeholder">PHOTO STAGE</div>
  </div>
  <div class="panel" class:visible={activePanel === 'map'}>
    <!-- World map filled in Task 8 -->
    <div class="placeholder">WORLD MAP</div>
  </div>
  <div class="panel" class:visible={activePanel === 'ending'}>
    <!-- Party card filled in Task 11 -->
    <div class="placeholder">PARTY CARD</div>
  </div>
  <div class="panel" class:visible={activePanel === 'outtakes'}>
    <!-- Outtakes reel filled in Task 11 -->
    <div class="placeholder">OUTTAKES REEL</div>
  </div>
</div>
```

- [ ] **Step 3: Add panel CSS**

Inside `<style>`, replace the `.debug-active` block with:

```css
.panel {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s ease;
}
.panel.visible {
  opacity: 1;
  pointer-events: auto;
}

.placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: monospace;
  font-size: 1.5rem;
  color: var(--accent-color);
  border: 1px dashed var(--border-color);
  padding: 1rem 2rem;
}
```

- [ ] **Step 4: Update placeholder steps in the MDX to test all 4 panels**

Edit `src/content/posts/caden-grad.mdx`'s `steps` array to:

```js
steps={[
  { kind: 'intro-greeting', caption: 'photo panel', duration: 4000 },
  { kind: 'map-intro', caption: 'map panel', duration: 4000 },
  { kind: 'ending', caption: 'ending panel', duration: 4000 },
  { kind: 'outtakes', caption: 'outtakes panel', duration: 4000 },
]}
```

- [ ] **Step 5: Browser verification**

Reload the post. Scroll through. Each step should crossfade the visual side to a different placeholder ("PHOTO STAGE" → "WORLD MAP" → "PARTY CARD" → "OUTTAKES REEL"). Crossfades are ~600ms. No flicker.

- [ ] **Step 6: Commit**

```bash
git add src/components/GradScrollytelling.svelte src/content/posts/caden-grad.mdx
git commit -m "Add kind-based panel stack for grad visual side"
```

---

## Task 5: Photo stage with intro-greeting + cap + gown + degree skits

**Files:**
- Modify: `src/components/GradScrollytelling.svelte`

Build the photo stage panel: a Caden image canvas with absolute-positioned overlays that animate in based on the active step. All overlays exist in the DOM; visibility is toggled by adding active classes per step.

- [ ] **Step 1: Replace the photo panel content**

In `GradScrollytelling.svelte`, replace the photo panel's placeholder div with:

```svelte
<div class="panel" class:visible={activePanel === 'photo'}>
  <div
    class="photo-stage"
    class:cap={['intro-skit-cap','intro-skit-gown','intro-skit-degree','late-nights','flying-colors'].includes(activeKind)}
    class:gown={['intro-skit-gown','intro-skit-degree','late-nights','flying-colors'].includes(activeKind)}
    class:degree={['intro-skit-degree','late-nights','flying-colors'].includes(activeKind)}
    class:tears={activeKind === 'late-nights'}
    class:flying={activeKind === 'flying-colors'}
  >
    <img class="caden-img" src={activeKind === 'flying-colors' ? cadenTriumphantPhoto : cadenPhoto} alt="Caden" />

    <div class="overlay cap-overlay">🎓</div>
    <div class="overlay gown-overlay">🥋</div>
    <div class="overlay degree-overlay">
      <div class="frame">
        <div class="parchment">M.S.<br/>Computer<br/>Science</div>
      </div>
    </div>

    <div class="overlay tear left">💧</div>
    <div class="overlay tear right">💧</div>
    <div class="overlay exam-bubble">
      <span class="bubble-text">{steps[activeIndex]?.examBubbles?.[examIdx] ?? ''}</span>
    </div>

    <div class="flying-stage">
      {#each ['#ff6b6b','#feca57','#48dbfb','#1dd1a1','#5f27cd','#ff9ff3','#54a0ff','#ee5253'] as color, i}
        <div class="winged-square" style="--c: {color}; --i: {i};">
          <span class="wing left">🪽</span>
          <span class="square" style="background: {color}"></span>
          <span class="wing right">🪽</span>
        </div>
      {/each}
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add `examIdx` rotating state**

In `<script>`, after `activeKind` derived, add:

```js
let examIdx = $state(0);
let examTimer = null;

$effect(() => {
  if (examTimer) {
    clearInterval(examTimer);
    examTimer = null;
  }
  examIdx = 0;
  if (activeKind === 'late-nights') {
    const list = steps[activeIndex]?.examBubbles ?? [];
    if (list.length > 1) {
      examTimer = setInterval(() => {
        examIdx = (examIdx + 1) % list.length;
      }, 1600);
    }
  }
  return () => {
    if (examTimer) clearInterval(examTimer);
  };
});
```

- [ ] **Step 3: Add photo-stage CSS**

Append to `<style>`:

```css
.photo-stage {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.caden-img {
  max-height: 90%;
  max-width: 60%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 4px 6px 18px rgba(0, 0, 0, 0.22);
  transition: opacity 0.5s ease;
}

.overlay {
  position: absolute;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s ease;
}

/* Cap */
.cap-overlay {
  font-size: 8rem;
  top: 8%;
  left: 50%;
  transform: translateX(-50%) translateY(-150%);
}
.photo-stage.cap .cap-overlay {
  opacity: 1;
  animation: cap-drop 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes cap-drop {
  0% { transform: translateX(-50%) translateY(-150%) rotate(-30deg); }
  60% { transform: translateX(-50%) translateY(10%) rotate(8deg); }
  100% { transform: translateX(-50%) translateY(-2%) rotate(-3deg); }
}

/* Gown */
.gown-overlay {
  font-size: 16rem;
  top: 38%;
  left: 50%;
  transform: translateX(-50%) scaleY(0.7);
  filter: drop-shadow(0 0 10px rgba(0,0,0,0.2));
}
.photo-stage.gown .gown-overlay {
  opacity: 0.9;
  animation: gown-fade 0.7s ease forwards;
}
@keyframes gown-fade {
  from { opacity: 0; transform: translateX(-50%) scaleY(0.7); }
  to   { opacity: 0.9; transform: translateX(-50%) scaleY(1); }
}

/* Degree */
.degree-overlay {
  bottom: 4%;
  left: 50%;
  transform: translateX(-50%) translateY(120%) rotate(-4deg);
}
.photo-stage.degree .degree-overlay {
  opacity: 1;
  animation: degree-thud 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes degree-thud {
  0% { transform: translateX(-50%) translateY(120%) rotate(-12deg); }
  70% { transform: translateX(-50%) translateY(-6%) rotate(2deg); }
  100% { transform: translateX(-50%) translateY(0) rotate(-4deg); }
}
.frame {
  width: 280px;
  height: 200px;
  background: #d4a574;
  border: 8px solid #6b3410;
  box-shadow: 6px 8px 22px rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}
.parchment {
  background: #f8e9c1;
  width: 90%;
  height: 88%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Times New Roman', serif;
  font-size: 1.4rem;
  font-weight: bold;
  text-align: center;
  color: #3a1d05;
}

/* Tears + exam bubble (late-nights) */
.tear {
  font-size: 3rem;
  top: 30%;
}
.tear.left  { left: calc(50% - 80px); }
.tear.right { left: calc(50% + 50px); }
.photo-stage.tears .tear {
  opacity: 1;
  animation: tear-drip 1.2s ease-in infinite;
}
@keyframes tear-drip {
  0% { transform: translateY(0); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateY(120px); opacity: 0; }
}

.exam-bubble {
  top: 18%;
  right: 6%;
  background: var(--bg-color);
  border: 3px solid var(--border-color);
  border-radius: 18px;
  padding: 14px 20px;
  font-size: 1.4rem;
  font-weight: bold;
  color: var(--accent-color);
  max-width: 280px;
  transform: rotate(4deg);
}
.exam-bubble::after {
  content: '';
  position: absolute;
  bottom: -16px;
  left: 30px;
  width: 0; height: 0;
  border: 12px solid transparent;
  border-top-color: var(--bg-color);
}
.photo-stage.tears .exam-bubble {
  opacity: 1;
  animation: bubble-flicker 1.6s ease-in-out infinite;
}
@keyframes bubble-flicker {
  0%, 100% { transform: rotate(4deg) scale(1); }
  10% { transform: rotate(4deg) scale(1.06); }
  50% { transform: rotate(2deg) scale(0.98); }
}

/* Flying colors */
.flying-stage {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.photo-stage.flying .flying-stage { opacity: 1; }

.winged-square {
  position: absolute;
  top: calc(15% + var(--i) * 10%);
  left: -20%;
  display: flex;
  align-items: center;
  gap: 4px;
  animation: wing-fly 2.6s ease-in forwards;
  animation-delay: calc(var(--i) * 0.18s);
  opacity: 0;
}
.photo-stage.flying .winged-square { opacity: 1; }
.square {
  width: 36px;
  height: 36px;
  display: inline-block;
  border: 2px solid rgba(0,0,0,0.6);
  box-shadow: 2px 3px 0 rgba(0,0,0,0.4);
}
.wing { font-size: 1.6rem; }
.wing.left  { transform: scaleX(-1); }
@keyframes wing-fly {
  0% { transform: translate(0, 0) rotate(-4deg); }
  50% { transform: translate(60vw, -40px) rotate(6deg); }
  100% { transform: translate(140vw, 30px) rotate(-2deg); }
}
```

- [ ] **Step 4: Update placeholder steps to exercise all 6 photo-kind variants**

Edit `src/content/posts/caden-grad.mdx` `steps` to:

```js
steps={[
  { kind: 'intro-greeting', caption: '**hey caden!** 🎓', duration: 4000 },
  { kind: 'intro-skit-cap', caption: "you've been promoted from *bachelor* to **master**.", duration: 5000 },
  { kind: 'intro-skit-gown', caption: 'ceremonial robe, just for you.', duration: 4000 },
  { kind: 'intro-skit-degree', caption: 'a degree so heavy you can barely hold it.', duration: 5000 },
  { kind: 'late-nights', caption: "many late nights, sweat, and tears…", duration: 8000,
    examBubbles: [
      "ahhh I'm gonna fail!!! (Algorithms)",
      "ahhh I'm gonna fail!!! (OS)",
      "ahhh I'm gonna fail!!! (Compilers)",
      "...every single exam.",
    ],
  },
  { kind: 'flying-colors', caption: 'but you passed with **flying colors.**', duration: 5000 },
]}
```

- [ ] **Step 5: Browser verification**

Reload. Scroll through six steps:
1. **intro-greeting:** Caden photo, no overlays
2. **intro-skit-cap:** Cap drops onto head with bounce
3. **intro-skit-gown:** Gown fades in below cap
4. **intro-skit-degree:** Framed M.S. degree thuds in from bottom
5. **late-nights:** Photo unchanged. Two tears drip. Speech bubble cycles through 4 exam texts every 1.6s
6. **flying-colors:** Photo swaps to triumphant version. 8 winged color squares flap across the screen left-to-right with staggered delays

- [ ] **Step 6: Commit**

```bash
git add src/components/GradScrollytelling.svelte src/content/posts/caden-grad.mdx
git commit -m "Add Caden photo stage with intro skits and animations"
```

---

## Task 6: World map panel + map-intro + fly transforms

**Files:**
- Modify: `src/components/GradScrollytelling.svelte`

Replace the map panel placeholder with the real world map. Add the coords table and transform calculation. The map's container is `overflow: hidden`; the inner SVG image transforms via CSS with a long ease.

- [ ] **Step 1: Add coords table and transform helper**

In `<script>`, after `activePanel`, add:

```js
const HOME = [-86.5861, 34.7304]; // Huntsville, AL

const COORDS = {
  saudiarabia:      [46.6753, 24.7136],   // Riyadh
  nepal:            [85.32,   27.72],     // Kathmandu
  pennsylvinia:     [-77.2,   41.2],      // PA center
  northcarolina:    [-79.0,   35.5],      // NC center
  atlanta:          [-84.39,  33.75],
  nashville:        [-86.78,  36.16],
  texas:            [-99.0,   31.5],      // TX center
  phoenixalabama:   [-85.0,   32.47],     // Phenix City, AL
  alabama:          [-86.79,  33.5],      // Alabama state-ish
  huntsville:       HOME,
};

const LOCATION_LABELS = {
  saudiarabia: 'Riyadh, Saudi Arabia',
  nepal: 'Kathmandu, Nepal',
  pennsylvinia: 'Pennsylvania, USA',
  northcarolina: 'North Carolina, USA',
  atlanta: 'Atlanta, GA',
  nashville: 'Nashville, TN',
  texas: 'Texas, USA',
  phoenixalabama: 'Phenix City, AL',
  alabama: 'Alabama, USA',
  huntsville: 'Huntsville, AL',
};

// Equirectangular projection on a 1000x500 viewBox.
// Returns CSS transform that centers (lng,lat) in a 100% panel at given zoom.
function flyTransform(coords, zoom = 1) {
  if (!coords) return 'translate(0, 0) scale(1)';
  const [lng, lat] = coords;
  // Coords on the SVG (origin top-left, 0..1000 / 0..500):
  const x = (lng + 180) / 360 * 1000;
  const y = (90 - lat) / 180 * 500;
  // We want (x, y) at the panel center after scaling.
  // Map fills panel with `object-fit: contain`; assume panel matches 2:1.
  // Center of the unscaled map is (500, 250).
  const dx = (500 - x) * zoom;
  const dy = (250 - y) * zoom;
  return `translate(${dx / 10}%, ${dy / 5}%) scale(${zoom})`;
}

const mapTransform = $derived.by(() => {
  const step = steps[activeIndex];
  if (!step) return flyTransform(null, 1);
  if (step.kind === 'map-intro') return flyTransform([0, 20], 1);
  if (step.kind === 'video') return flyTransform(COORDS[step.locationKey] ?? null, step.zoom ?? 6);
  if (step.kind === 'map-home') return flyTransform(HOME, 11);
  return flyTransform(null, 1);
});
```

- [ ] **Step 2: Replace the map panel content**

Replace the map panel placeholder with:

```svelte
<div class="panel" class:visible={activePanel === 'map'}>
  <div class="map-frame">
    <img
      class="world-map"
      src={worldMap}
      alt="World map"
      style="transform: {mapTransform};"
    />
    {#if steps[activeIndex]?.kind === 'video' || steps[activeIndex]?.kind === 'map-home'}
      <div class="map-pin">📍</div>
      <div class="map-label">
        <strong>{steps[activeIndex]?.name ?? ''}</strong>
        <span>{LOCATION_LABELS[steps[activeIndex]?.locationKey] ?? ''}</span>
      </div>
    {/if}
  </div>
</div>
```

- [ ] **Step 3: Add map CSS**

Append to `<style>`:

```css
.map-frame {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--bg-color);
}

.world-map {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: auto;
  aspect-ratio: 2 / 1;
  margin-top: -25%;
  margin-left: -50%;
  color: var(--accent-color);
  transition: transform 1.8s cubic-bezier(0.65, 0, 0.35, 1);
  will-change: transform;
}

.map-pin {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -100%);
  font-size: 3rem;
  z-index: 2;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
  animation: pin-bob 2.4s ease-in-out infinite;
}
@keyframes pin-bob {
  0%, 100% { transform: translate(-50%, -100%) translateY(0); }
  50% { transform: translate(-50%, -100%) translateY(-8px); }
}

.map-label {
  position: absolute;
  bottom: 8%;
  left: 50%;
  transform: translateX(-50%) rotate(-1deg);
  background: var(--bg-color);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 18px;
  text-align: center;
  z-index: 2;
  box-shadow: 3px 4px 12px rgba(0,0,0,0.18);
}
.map-label strong {
  display: block;
  color: var(--accent-color);
  font-size: 1.3rem;
}
.map-label span {
  display: block;
  color: var(--text-color);
  font-size: 0.95rem;
}
```

- [ ] **Step 4: Add a map-intro step to MDX to test**

Edit `caden-grad.mdx` `steps`, adding after `flying-colors`:

```js
{ kind: 'map-intro', caption: 'here\'s what your friends have to say. **from all around the world.**', duration: 4000 },
{ kind: 'video', name: 'Chase', locationKey: 'saudiarabia', src: '/squiggly-lines/videos/CHG Videos/Chase-saudiarabia.MOV', caption: '**chase** — riyadh.', duration: 'video-end', zoom: 4 },
{ kind: 'video', name: 'Mamu & Daddy', locationKey: 'nepal', src: '/squiggly-lines/videos/CHG Videos/Mamu&Daddy-nepal.mp4', caption: '**mamu & daddy** — nepal.', duration: 'video-end', zoom: 4 },
{ kind: 'map-home', name: 'Home', locationKey: 'huntsville', caption: 'and after every trip, back here. **huntsville.**', duration: 5000 },
```

- [ ] **Step 5: Browser verification**

Reload. Scroll past Act 1 into Act 2:
- map-intro: world map shows full world view, no pin
- video (Chase): map flies (1.8s smooth) to Saudi Arabia at higher zoom; pin and label appear
- video (Mamu & Daddy): map flies from Saudi Arabia to Nepal
- map-home: map flies to Huntsville at high zoom

(Video player overlay added in Task 7 — for now you'll just see the map fly with no video playing.)

- [ ] **Step 6: Commit**

```bash
git add src/components/GradScrollytelling.svelte src/content/posts/caden-grad.mdx
git commit -m "Add world map panel with fly-to transforms"
```

---

## Task 7: Video player overlay + advance-on-ended

**Files:**
- Modify: `src/components/GradScrollytelling.svelte`

Add a `<video>` element that appears as a polaroid-style card overlay on the map during `video` steps. Only the active step's video is mounted (saves memory with 12 videos). Plays muted on autoplay, with an unmute toggle.

- [ ] **Step 1: Add video state**

In `<script>`, after `mapTransform`, add:

```js
let videoEl;
let videoMuted = $state(true);

function toggleMute() {
  videoMuted = !videoMuted;
}

$effect(() => {
  // Re-runs when activeIndex changes; videoEl is the (re-bound) <video>.
  if (videoEl && steps[activeIndex]?.kind === 'video') {
    videoEl.currentTime = 0;
    videoEl.muted = videoMuted;
    const playPromise = videoEl.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(() => { /* autoplay blocked; user must tap */ });
    }
  }
});
```

- [ ] **Step 2: Add video overlay markup**

Inside the map panel, after `.map-label`, add:

```svelte
{#if steps[activeIndex]?.kind === 'video' && steps[activeIndex]?.src}
  {#key activeIndex}
    <div class="video-card">
      <video
        bind:this={videoEl}
        src={steps[activeIndex].src}
        muted={videoMuted}
        playsinline
        preload="metadata"
        onended={() => { /* hooked up to autoplay-advance in Task 10 */ }}
      ></video>
      <button class="mute-toggle" type="button" onclick={toggleMute}>
        {videoMuted ? '🔇 unmute' : '🔊 mute'}
      </button>
    </div>
  {/key}
{/if}
```

(`{#key activeIndex}` forces re-mount when step changes — clean state per video.)

- [ ] **Step 3: Add video CSS**

Append to `<style>`:

```css
.video-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-1.5deg);
  width: min(50vw, 540px);
  max-height: 70vh;
  background: var(--bg-color);
  border: 6px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 8px 10px 30px rgba(0, 0, 0, 0.35);
  z-index: 3;
  padding: 8px 8px 36px;
}
.video-card video {
  width: 100%;
  max-height: 60vh;
  display: block;
  background: #000;
}
.mute-toggle {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: var(--bg-color);
  color: var(--accent-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.85rem;
  cursor: pointer;
}
.mute-toggle:hover {
  background: var(--accent-color);
  color: var(--bg-color);
}
```

- [ ] **Step 4: Browser verification**

Reload. Scroll into a `video` step (Chase, then Mamu&Daddy):
- A polaroid-style card appears centered over the map
- Video starts playing automatically (muted)
- Mute toggle in bottom-right of the card switches between 🔇/🔊
- Map fly + video card both visible
- Scrolling past the step unmounts the video (no audio bleed)

- [ ] **Step 5: Commit**

```bash
git add src/components/GradScrollytelling.svelte
git commit -m "Add video player overlay for grad map steps"
```

---

## Task 8: Inline ambient PiP bloopers during Act 2

**Files:**
- Modify: `src/components/GradScrollytelling.svelte`

Pin a small looping video to the bottom-right corner during ALL `map-*` and `video` kind steps. Cycles through the 4 blooper files. Dims while a main video is playing (so it doesn't compete).

- [ ] **Step 1: Add blooper state**

In `<script>`, near the video state, add:

```js
const BLOOPERS = [
  '/squiggly-lines/videos/CHG Videos/bloopers/Mamu&DaddyBloopers.mp4',
  '/squiggly-lines/videos/CHG Videos/bloopers/Mamu&DaddyBloopers1.mp4',
  '/squiggly-lines/videos/CHG Videos/bloopers/Mamu&DaddyBloopers2.mp4',
  '/squiggly-lines/videos/CHG Videos/bloopers/Mom&Addison2.mp4',
];

const showBlooper = $derived(MAP_KINDS.has(activeKind));
const blooperIdx = $derived(activeIndex % BLOOPERS.length);
const blooperDimmed = $derived(activeKind === 'video');
```

- [ ] **Step 2: Add blooper PiP markup**

After the closing `</div>` of `.grid` (still inside `.scrollytelling`), add:

```svelte
{#if showBlooper && inView}
  {#key blooperIdx}
    <video
      class="blooper-pip"
      class:dim={blooperDimmed}
      src={BLOOPERS[blooperIdx]}
      muted
      autoplay
      loop
      playsinline
      preload="metadata"
    ></video>
  {/key}
{/if}
```

- [ ] **Step 3: Add blooper CSS**

Append to `<style>`:

```css
.blooper-pip {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  width: 240px;
  height: 180px;
  object-fit: cover;
  border: 4px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 4px 6px 18px rgba(0,0,0,0.3);
  transform: rotate(2deg);
  background: #000;
  z-index: 25;
  transition: opacity 0.4s ease;
  opacity: 1;
}
.blooper-pip.dim { opacity: 0.3; }

@media (max-width: 780px) {
  .blooper-pip {
    width: 160px;
    height: 120px;
    bottom: 0.5rem;
    right: 0.5rem;
  }
}
```

- [ ] **Step 4: Browser verification**

Reload. Scroll into Act 2 (`map-intro`, video, video, map-home):
- A small tilted video appears bottom-right corner
- It loops silently
- Cycles to a different blooper as you advance steps
- Dims to 30% opacity while a main video step is active
- Disappears when you scroll OUT of Act 2 (back into intro skits or out of the post entirely)
- Doesn't conflict with the progress bar / progress indicator (it's lower-right, they're top-right)

- [ ] **Step 5: Commit**

```bash
git add src/components/GradScrollytelling.svelte
git commit -m "Add ambient blooper PiP during grad map section"
```

---

## Task 9: Ending placeholder card + outtakes reel

**Files:**
- Modify: `src/components/GradScrollytelling.svelte`

Replace the `ending` and `outtakes` placeholders with the real implementations. The ending is a swap-tomorrow placeholder card. The outtakes reel autoplays each blooper end-to-end then shows a "fin." card.

- [ ] **Step 1: Add ending state**

In `<script>` add:

```js
let outtakeIdx = $state(0);
let outtakeFin = $state(false);

$effect(() => {
  if (activeKind === 'outtakes') {
    outtakeIdx = 0;
    outtakeFin = false;
  }
});

function advanceOuttake() {
  if (outtakeIdx < BLOOPERS.length - 1) {
    outtakeIdx += 1;
  } else {
    outtakeFin = true;
  }
}
```

- [ ] **Step 2: Replace ending and outtakes panels**

Replace the two placeholder panels with:

```svelte
<div class="panel" class:visible={activePanel === 'ending'}>
  <div class="party-card">
    <!-- SWAP POINT: replace this block with <img src="/squiggly-lines/images/party.jpg" /> after the surprise party. -->
    <div class="placeholder-party">
      🎉<br/>
      <strong>the surprise party</strong><br/>
      <span>photos land here<br/>tomorrow</span><br/>
      🎉
    </div>
  </div>
</div>
<div class="panel" class:visible={activePanel === 'outtakes'}>
  {#if outtakeFin}
    <div class="fin-card">fin.</div>
  {:else}
    {#key outtakeIdx}
      <video
        class="outtake-reel"
        src={BLOOPERS[outtakeIdx]}
        autoplay
        playsinline
        preload="metadata"
        onended={advanceOuttake}
      ></video>
    {/key}
  {/if}
</div>
```

- [ ] **Step 3: Add ending/outtakes CSS**

Append to `<style>`:

```css
.party-card {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.placeholder-party {
  background: var(--bg-color);
  border: 4px dashed var(--border-color);
  border-radius: 12px;
  padding: 2.5rem 3rem;
  text-align: center;
  font-size: 1.4rem;
  color: var(--text-color);
  transform: rotate(-1.5deg);
  box-shadow: 4px 6px 18px rgba(0,0,0,0.18);
}
.placeholder-party strong {
  font-size: 2rem;
  color: var(--accent-color);
  display: block;
  margin: 0.5rem 0;
}
.placeholder-party span {
  font-size: 1rem;
  color: var(--text-color);
  opacity: 0.7;
}

.outtake-reel {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.fin-card {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Times New Roman', serif;
  font-size: 8rem;
  font-style: italic;
  color: var(--accent-color);
  background: var(--bg-color);
}
```

- [ ] **Step 4: Add ending and outtakes steps to MDX**

Edit `caden-grad.mdx` `steps`, appending after the `map-home` step:

```js
{ kind: 'ending', caption: '🎉 **congratulations caden!!!**', duration: 6000 },
{ kind: 'outtakes', caption: 'and now — **the outtakes.**', duration: 30000 },
```

- [ ] **Step 5: Browser verification**

Reload. Scroll to the very end:
- After `map-home`, ending card appears: "🎉 the surprise party — photos land here tomorrow"
- The outtakes step plays each of the 4 blooper videos in sequence (autoplay, with audio)
- After the last blooper ends, a giant italic "fin." card appears
- Active blooper unmounts when scrolling past

- [ ] **Step 6: Commit**

```bash
git add src/components/GradScrollytelling.svelte src/content/posts/caden-grad.mdx
git commit -m "Add party-card placeholder ending and outtakes reel"
```

---

## Task 10: Autoplay state machine + play button

**Files:**
- Modify: `src/components/GradScrollytelling.svelte`

Add a `▶ play` button (top-left below back-link). Click → autoplay starts at current step. Each step's `duration` (or `'video-end'`) determines when to advance. User wheel/touch cancels autoplay.

- [ ] **Step 1: Add autoplay state**

In `<script>`, near the top after the `inView` declaration, add:

```js
let autoplay = $state(false);
let autoplayTimer = null;
let autoplayCancelled = $state(false);

function clearAutoplayTimer() {
  if (autoplayTimer) {
    clearTimeout(autoplayTimer);
    autoplayTimer = null;
  }
}

function scheduleAutoplayAdvance() {
  clearAutoplayTimer();
  if (!autoplay) return;
  if (activeIndex >= steps.length - 1) {
    autoplay = false;
    return;
  }
  const step = steps[activeIndex];
  const advance = () => {
    const next = storyEl?.querySelectorAll('.step')[activeIndex + 1];
    if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  if (step.duration === 'video-end') {
    // Video onended will schedule advance; fallback timer 30s
    autoplayTimer = setTimeout(advance, 30000);
  } else {
    autoplayTimer = setTimeout(advance, step.duration ?? 5000);
  }
}

$effect(() => {
  if (autoplay && !autoplayCancelled) {
    scheduleAutoplayAdvance();
  } else {
    clearAutoplayTimer();
  }
});

function startAutoplay() {
  autoplayCancelled = false;
  autoplay = true;
}
function stopAutoplay() {
  autoplay = false;
  autoplayCancelled = true;
  clearAutoplayTimer();
}
```

- [ ] **Step 2: Hook video-end to autoplay advance**

Modify the `video` element inside the map panel: change `onended` to advance the page when autoplay is active:

```svelte
<video
  bind:this={videoEl}
  src={steps[activeIndex].src}
  muted={videoMuted}
  playsinline
  preload="metadata"
  onended={() => {
    if (autoplay) {
      const next = storyEl?.querySelectorAll('.step')[activeIndex + 1];
      if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }}
></video>
```

- [ ] **Step 3: Wire up wheel/touch cancel + onMount cleanup**

Inside `onMount`, after `rootObserver.observe(rootEl);`, add:

```js
function onUserScroll() {
  if (autoplay) stopAutoplay();
}
window.addEventListener('wheel', onUserScroll, { passive: true });
window.addEventListener('touchstart', onUserScroll, { passive: true });
window.addEventListener('keydown', (e) => {
  if (['ArrowDown','ArrowUp','PageDown','PageUp','Space','Home','End'].includes(e.code)) {
    onUserScroll();
  }
});
```

In the `return () => { ... }` cleanup at the end of `onMount`, add:

```js
window.removeEventListener('wheel', onUserScroll);
window.removeEventListener('touchstart', onUserScroll);
clearAutoplayTimer();
```

- [ ] **Step 4: Add play button markup**

Right after the back-link in the template:

```svelte
<button
  class="play-button"
  class:hidden={!inView}
  class:playing={autoplay}
  type="button"
  onclick={() => autoplay ? stopAutoplay() : startAutoplay()}
>
  {#if autoplay}
    ⏸ pause
  {:else if activeIndex >= steps.length - 1}
    ↻ replay
  {:else}
    ▶ play
  {/if}
</button>
```

When clicking ↻ replay, scroll to first step:

```svelte
<button
  class="play-button"
  class:hidden={!inView}
  class:playing={autoplay}
  type="button"
  onclick={() => {
    if (autoplay) {
      stopAutoplay();
    } else if (activeIndex >= steps.length - 1) {
      const first = storyEl?.querySelectorAll('.step')[0];
      if (first) first.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => startAutoplay(), 600);
    } else {
      startAutoplay();
    }
  }}
>
  {#if autoplay}⏸ pause{:else if activeIndex >= steps.length - 1}↻ replay{:else}▶ play{/if}
</button>
```

- [ ] **Step 5: Add play button CSS**

Append to `<style>`:

```css
.play-button {
  position: fixed;
  top: 6rem;
  left: 1rem;
  z-index: 21;
  background: var(--accent-color);
  color: var(--bg-color);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 18px;
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 3px 4px 12px rgba(0,0,0,0.2);
  transition: opacity 0.3s ease, transform 0.2s ease;
}
.play-button:hover { transform: translateY(-1px); }
.play-button.playing {
  background: var(--bg-color);
  color: var(--accent-color);
}
```

- [ ] **Step 6: Browser verification**

Reload. Scroll to top of post.
- ▶ play button visible top-left below back-link
- Click play: page auto-scrolls to step 2 after step 1's duration (4s); each step advances on its own duration
- Video steps wait until video ends (or 30s fallback) before advancing
- Use the mouse wheel mid-autoplay: button reverts to ▶ play, scrolling stops auto-advancing
- Reach last step: button shows ↻ replay; click to scroll back to top and resume autoplay
- Verify the autoplay timer doesn't fire when paused

- [ ] **Step 7: Commit**

```bash
git add src/components/GradScrollytelling.svelte
git commit -m "Add autoplay state machine and play button"
```

---

## Task 11: Mobile breakpoint + theme verification

**Files:**
- Modify: `src/components/GradScrollytelling.svelte`

The base layout already collapses to single column on `max-width: 780px` thanks to the bigfoot-derived CSS at the bottom. Verify panel-specific elements (photo stage, video card, map) all behave on mobile. Tweak as needed.

- [ ] **Step 1: Audit mobile media query block**

The existing `@media (max-width: 780px)` block in the component should already reduce `.grid` to 1 column and shrink `.visual-side` to 65vh. Add the following inside the same media query:

```css
@media (max-width: 780px) {
  /* (existing rules above) */

  .video-card {
    width: 90vw;
    max-height: 50vh;
  }
  .video-card video {
    max-height: 42vh;
  }

  .photo-stage .cap-overlay { font-size: 5rem; }
  .photo-stage .gown-overlay { font-size: 11rem; }
  .frame { width: 200px; height: 150px; }
  .parchment { font-size: 1.1rem; }
  .exam-bubble { font-size: 1.1rem; right: 4%; max-width: 200px; }
  .placeholder-party { padding: 1.5rem 2rem; font-size: 1.1rem; }
  .placeholder-party strong { font-size: 1.5rem; }
  .fin-card { font-size: 5rem; }
  .play-button { top: 5rem; }
}
```

- [ ] **Step 2: Browser verification — mobile**

In dev tools, set viewport to a small mobile size (375 × 667, e.g., iPhone SE). Reload. Scroll through every step:
- Layout collapses to single column: visual on top, story below
- Photo stage overlays scale appropriately (no cap covering the whole face)
- Video card fills 90vw and is readable
- Map panel scales correctly
- Blooper PiP shrinks to 160×120 in bottom-right
- Play button doesn't overlap back-link

- [ ] **Step 3: Browser verification — theme toggle**

Use the existing theme toggle (top-right of every page). Switch between light and dark.
- Backgrounds, text, borders all swap correctly via the `var(--bg-color)`/`var(--accent-color)`/`var(--border-color)`/`var(--text-color)` variables
- Photo and videos look fine in both
- World map SVG (which uses `currentColor`) recolors with the theme

- [ ] **Step 4: Commit**

```bash
git add src/components/GradScrollytelling.svelte
git commit -m "Polish grad mobile breakpoint and theme integration"
```

---

## Task 12: Fill final content — full steps array, captions, durations

**Files:**
- Modify: `src/content/posts/caden-grad.mdx`

Replace the partial steps array with the complete final list spanning all three acts. Use the location-encoded filenames in `public/videos/CHG Videos/`. Order map flythroughs farthest-from-Huntsville → closest, ending naturally on Huntsville.

- [ ] **Step 1: Replace `steps` array in `caden-grad.mdx`**

```js
steps={[
  // Act 1: The Promotion
  { kind: 'intro-greeting', caption: '**hey caden!** 🎓', duration: 4500 },
  { kind: 'intro-skit-cap', caption: "you've been promoted from *bachelor* to **master**.", duration: 5000 },
  { kind: 'intro-skit-gown', caption: 'ceremonial robe — somehow heavier than it looks.', duration: 4000 },
  { kind: 'intro-skit-degree', caption: 'and a degree so heavy you can barely hold it.', duration: 5500 },
  { kind: 'late-nights', caption: "many late nights, sweat, and tears to get here…", duration: 9000,
    examBubbles: [
      "ahhh I'm gonna fail!!! (Algorithms)",
      "ahhh I'm gonna fail!!! (Operating Systems)",
      "ahhh I'm gonna fail!!! (Compilers)",
      "ahhh I'm gonna fail!!! (Networks)",
      "...every. single. exam.",
    ],
  },
  { kind: 'flying-colors', caption: 'but you passed with **flying colors.** 🪽', duration: 5500 },

  // Act 2: Voices from around the world (farthest → closest)
  { kind: 'map-intro', caption: "here's what your friends and family have to say. **from all around the world.**", duration: 4500 },

  { kind: 'video', name: 'Chase', locationKey: 'saudiarabia',
    src: '/squiggly-lines/videos/CHG Videos/Chase-saudiarabia.MOV',
    caption: '**chase** — riyadh, saudi arabia. 🇸🇦', duration: 'video-end', zoom: 4 },

  { kind: 'video', name: 'Mamu & Daddy', locationKey: 'nepal',
    src: '/squiggly-lines/videos/CHG Videos/Mamu&Daddy-nepal.mp4',
    caption: '**mamu & daddy** — nepal. 🇳🇵', duration: 'video-end', zoom: 4 },

  { kind: 'video', name: 'Brandon', locationKey: 'pennsylvinia',
    src: '/squiggly-lines/videos/CHG Videos/BrandonDang-pennsylvinia.mov',
    caption: '**brandon** — pennsylvania.', duration: 'video-end', zoom: 6 },

  { kind: 'video', name: 'Collettee', locationKey: 'northcarolina',
    src: '/squiggly-lines/videos/CHG Videos/collettee-northcarolina.MOV',
    caption: '**collettee** — north carolina.', duration: 'video-end', zoom: 6 },

  { kind: 'video', name: 'Collettee (again!)', locationKey: 'northcarolina',
    src: '/squiggly-lines/videos/CHG Videos/collettee2-northcarolina.MOV',
    caption: '**collettee, take two.**', duration: 'video-end', zoom: 6 },

  { kind: 'video', name: 'Liesl', locationKey: 'atlanta',
    src: '/squiggly-lines/videos/CHG Videos/Liesl-atlanta.mov',
    caption: '**liesl** — atlanta.', duration: 'video-end', zoom: 6 },

  { kind: 'video', name: 'Angela', locationKey: 'atlanta',
    src: '/squiggly-lines/videos/CHG Videos/Angela-atlanta.mp4',
    caption: '**angela** — atlanta.', duration: 'video-end', zoom: 6 },

  { kind: 'video', name: 'Mom & Addison', locationKey: 'atlanta',
    src: '/squiggly-lines/videos/CHG Videos/Mom&Addison-atlanta.mp4',
    caption: '**mom & addison** — atlanta.', duration: 'video-end', zoom: 6 },

  { kind: 'video', name: 'Saam', locationKey: 'nashville',
    src: '/squiggly-lines/videos/CHG Videos/Saam-nashville.mp4',
    caption: '**saam** — nashville.', duration: 'video-end', zoom: 6 },

  { kind: 'video', name: 'Ben', locationKey: 'texas',
    src: '/squiggly-lines/videos/CHG Videos/Ben-texas.mov',
    caption: '**ben** — texas.', duration: 'video-end', zoom: 5 },

  { kind: 'video', name: 'Blaine & Ramona', locationKey: 'phoenixalabama',
    src: '/squiggly-lines/videos/CHG Videos/Blaine&Ramona-phoenixalabama.mp4',
    caption: '**blaine & ramona** — phenix city, AL.', duration: 'video-end', zoom: 7 },

  { kind: 'video', name: 'Dad', locationKey: 'alabama',
    src: '/squiggly-lines/videos/CHG Videos/Dad-alabama.mp4',
    caption: '**dad** — alabama.', duration: 'video-end', zoom: 7 },

  { kind: 'map-home', name: 'Home', locationKey: 'huntsville',
    caption: 'and after every trip, back here. **huntsville.**', duration: 5000 },

  // Act 3: Home, at last
  { kind: 'ending', caption: '🎉 **congratulations, caden!!!**', duration: 7000 },
  { kind: 'outtakes', caption: 'and now — **the outtakes.**', duration: 30000 },
]}
```

- [ ] **Step 2: Browser verification — full pass**

Reload. Scroll through every step end-to-end:
- Total ~22 steps; progress indicator reads `XX / 22`
- Every step's caption appears on the right
- Every video step's video loads and plays
- Map flies between locations smoothly
- Final outtakes reel + fin. card

Then click ▶ play from top and let the entire post auto-play through. Check:
- Auto-advance works at every step type (intro, late-nights, flying-colors, map-intro, video, map-home, ending, outtakes)
- Each video transition is clean (no overlap, no flash)
- Paces feel right; if any step lingers too long or rushes, tune `duration` in the steps array

- [ ] **Step 3: Adjust timings**

Watch the autoplay run twice. Note any steps that feel too short or too long. Edit `duration` values in `caden-grad.mdx` to taste. Common adjustments:
- Cap drop / degree thud need ~5s minimum (animations are 0.9–1.5s; readers need time to register the joke)
- `late-nights` step duration ≥ `examBubbles.length * 1.6s` so all bubbles cycle
- `ending` ~7s for the moment to land

- [ ] **Step 4: Commit**

```bash
git add src/content/posts/caden-grad.mdx
git commit -m "Fill grad scrollytelling with final steps, captions, videos"
```

---

## Task 13: Final manual verification + cleanup

**Files:**
- Modify: `src/components/GradScrollytelling.svelte` (only if issues found)

- [ ] **Step 1: Manual verification — desktop golden path**

Open `/posts/caden-grad/` in a real browser at desktop resolution (1440×900):
- Scroll-driven mode: scroll through every step start to finish; observe each animation
- Click ▶ play from top: full autoplay run completes without intervention
- Mid-run, scroll the wheel — verify autoplay cancels
- Click ▶ play again from current step — verify resumes
- Reach the end; click ↻ replay — verify scrolls to top and restarts
- Back-link works (returns to `/misc/` since category is `misc`)
- Theme toggle works on this page

- [ ] **Step 2: Manual verification — mobile golden path**

Resize to mobile viewport (375×667). Repeat scroll-through. Verify the layout doesn't break, blooper PiP doesn't cover key content, video card fits.

- [ ] **Step 3: Manual verification — edge cases**

- Refresh mid-scroll: page restores to scroll position cleanly; observer reattaches; correct step active
- Open a video step, click unmute, scroll past — audio cuts when video unmounts
- Open the post in a fresh tab (no referrer): back-link goes to `/squiggly-lines/misc` (not `history.back()`)
- Open in dark mode then light mode — both look correct

- [ ] **Step 4: Type/build check**

```bash
npm run build
```
Expected: build succeeds with no errors. Static files generated under `dist/`.

- [ ] **Step 5: Verify spec coverage**

Open `docs/superpowers/specs/2026-05-02-caden-grad-scrollytelling-design.md`. Confirm every section's behavior was implemented:
- ✅ Architecture (single component, kind-based panels)
- ✅ Step kinds: intro-greeting, intro-skit-cap, intro-skit-gown, intro-skit-degree, late-nights, flying-colors, map-intro, video, map-home, ending, outtakes
- ✅ Animation inventory (cap-drop, gown-fade, degree-thud, tear-drip, bubble-flicker, wing-fly, map-fly, pin-bob)
- ✅ Autoplay state machine
- ✅ Inline ambient PiP bloopers (Act 2)
- ✅ Outtakes reel
- ✅ Mobile breakpoint, theme integration
- ✅ Compression script (NOT executed; deferred per Slesa)
- ✅ Party photo swap point with comment in MDX

If any item is missing, return to the relevant task and implement before proceeding.

- [ ] **Step 6: Final commit**

```bash
git status
# If any tweaks were made:
git add -A
git commit -m "Tune grad scrollytelling timings after full verification"
```

---

## Deferred (do NOT do unless explicitly asked)

These are **not** part of this plan and live in `docs/caden-grad-extras-parking-lot.md`:

- "loading… graduating…" progress bar at post start
- Achievement-unlocked toasts at key beats
- Panic-attack tally counters during `late-nights`
- MS Paint arrows pointing at gags
- Tuition-paid stamp on the framed degree
- Goofy credits roll at the very end

Pull these in only if base post ships with significant time to spare before tomorrow's surprise party.

## Pre-deploy checklist (separate from this plan)

When ready to push, run in this order:

1. `bash scripts/compress-grad-videos.sh` (compresses videos in place; originals → `.originals/`)
2. Verify videos still play correctly post-compression in dev
3. Replace party-photo placeholder in `caden-grad.mdx` with the actual photo
4. `git add public/videos public/images src/content/posts/caden-grad.mdx`
5. `git commit -m "Compress grad videos and add party photo"`
6. `git push`
