# Squiggly Lines - Architecture Document

## Overview

Squiggly Lines is an Astro-based personal blog/portfolio site for documenting projects, art, and life events. It features a distinctive hand-drawn aesthetic with custom SVG squiggly line decorations, dark/light theme support, and interactive content through Svelte components.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Static Generator | Astro | Site building, routing, and content collections |
| Interactive Components | Svelte | Client-side interactivity (hydrated islands) |
| Content Format | MDX | Markdown with embedded components |
| Styling | SCSS + CSS Custom Properties | Preprocessing and theming |
| Type Safety | TypeScript | Static typing |
| CI/CD | GitHub Actions | Automated builds and deployment |
| Hosting | GitHub Pages | Static site hosting |

## Directory Structure

```
squiggly-lines/
├── astro.config.mjs         # Astro configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies and scripts
├── public/                  # Static assets (copied as-is)
│   └── images/
│       ├── cool.png         # Profile image (light theme); also the default link-preview image
│       ├── sleepy.png       # Profile image (dark theme)
│       ├── squiggle.svg     # Squiggle line tile (CSS mask, see Styling → Squiggles)
│       ├── squiggle-edge.svg # Footer's wavy top edge tile
│       └── icons/           # Social media icons
├── src/
│   ├── components/
│   │   ├── Header.astro     # Site header with squiggly line
│   │   ├── Footer.astro     # Site footer with squiggly line
│   │   ├── Sidebar.astro    # Profile, social links, nav, theme toggle
│   │   ├── ThemeToggle.astro # Dark/light mode toggle button
│   │   ├── PostList.astro   # Post list: category filter chips, cards, pagination, end note
│   │   ├── PostCard.astro   # Blog post preview card
│   │   └── Pagination.astro # "newer / older posts" navigation
│   ├── layouts/
│   │   ├── BaseLayout.astro # Master layout (header, sidebar, footer, theme init, meta/OG tags)
│   │   └── PostLayout.astro # Individual post layout (back link, article, date)
│   ├── pages/
│   │   ├── index.astro      # Home page (intro + latest posts)
│   │   ├── 404.astro        # Not-found page
│   │   ├── posts/index.astro            # All posts, page 1
│   │   ├── posts/page/[page].astro      # All posts, page 2+ (/posts/page/2/)
│   │   ├── [category]/[...page].astro   # One paginated route per category in use
│   │   └── posts/[...slug].astro        # Individual post pages
│   ├── content/
│   │   └── posts/           # Blog posts (Markdown/MDX)
│   ├── styles/
│   │   ├── global.scss      # CSS variables, layout, typography, responsive
│   │   └── blog.scss        # Post cards, filter chips, pagination, back link
│   ├── lib/posts.ts         # getSortedPosts(), getCategories(), pageCount()
│   ├── lib/back.ts          # Shared "go back" link handler
│   ├── consts.ts            # Site config, social links, pagination, getBase()
│   └── content.config.ts    # Content collection schema
├── .github/workflows/
│   └── astro.yml            # GitHub Actions deployment
└── claude/                  # Documentation
    ├── index.md
    └── architecture.md
```

## Component Architecture

### Layout Hierarchy

```
BaseLayout.astro (Master Layout; props: title, description, image, type, fullscreen)
├── <head>
│   ├── Meta description, canonical, Open Graph tags, Google Fonts, Global styles
│   │   (title becomes "<title> · squiggly lines"; preview image defaults to cool.png)
│   └── Inline script: theme flash prevention (reads localStorage), keeps the theme
│       across client-side navigations, and sets window.__sqSoftNav for "go back" links
├── <html> (sets --display-picture-light/dark CSS vars from base path)
├── Header.astro
│   ├── Site title + tagline
│   └── Squiggly line: the original stretched SVG (kept on purpose, see Styling → Squiggles)
├── <div class="main">
│   ├── Sidebar.astro
│   │   ├── Profile image (CSS background-image, swaps per theme)
│   │   ├── Social links
│   │   ├── Site nav: home · posts (active state highlighted)
│   │   ├── ThemeToggle.astro (sun/moon button)
│   │   └── On phones, off the home page: `.compact` slim bar (small avatar, nav, toggle)
│   └── Content Wrapper
│       └── <slot /> (page content; post lists render PostList.astro:
│           category filter chips, cards, pagination, end-of-list note)
└── Footer.astro
    └── Copyright (the wavy top edge is the footer's own ::before, see Styling → Squiggles)

Page layout: the whole page scrolls normally. Header on top, sticky sidebar on the
left, content on the right, footer at the end (pushed to the bottom of the window on
short pages). Fullscreen posts (`fullscreen: true`) drop the header, sidebar and
footer: `body.layout-fullscreen` locks the window and the post's component scrolls
inside `.content-wrapper`.

PostLayout.astro (extends BaseLayout; passes the post's excerpt/cover as description/image)
├── Back link (<< go back; handled by goBack() from src/lib/back.ts)
└── Article wrapper
    ├── Title
    ├── <slot /> (rendered markdown)
    └── Date
```

## Theming (Dark/Light Mode)

### How It Works

1. **CSS Custom Properties** defined in `:root` (light) and `[data-theme="dark"]`
2. **ThemeToggle.astro** reads/writes `localStorage` key `theme`, sets `data-theme` on `<html>`
3. **Flash prevention** via inline `<script is:inline>` in `<head>` that sets theme before render
4. **System preference** respected via `prefers-color-scheme` on first visit

### Theme Variables

| Variable | Light | Dark |
|----------|-------|------|
| `--accent-color` | `#c23616` | `#e84118` |
| `--text-color` | `black` | `#e0e0e0` |
| `--text-secondary` | `#333` | `#aaa` |
| `--bg-color` | `white` | `#212327` |
| `--footer-bg` | `black` | `#080f18` |
| `--footer-text` | `white` | `#e0e0e0` |
| `--link-color` | `purple` | `#bb86fc` |
| `--border-color` | `rgba(222, 120, 30, 0.55)` | `rgba(224, 108, 0, 0.5)` |
| `--squiggly-color` | `black` | `#e0e0e0` |
| `--display-picture` | `cool.png` | `sleepy.png` |

Not theme-dependent: `--sidebar-width` (30%) and `--squiggle-width` (drawn width of the squiggle tile; smaller on phones).

### Squiggles

Squiggles take their colour from CSS (`currentColor` / theme variables), so they follow the theme.

- **Header** — the original inline SVG in `Header.astro`, stretched to the full width with `preserveAspectRatio="none"`. Kept on purpose: the stretching makes the line taper, and its dip gets cut off at the bottom of the 20px box.
- **Everything else** uses tiles in `public/images/` as CSS masks, drawn at a fixed width so they keep their uneven shape instead of stretching with the screen (very wide screens repeat them):
  - `.squiggle` (global.scss) — a line in `currentColor`, from `squiggle.svg` (the header wave plus a rotated copy, so it repeats without a kink). Used for the home page divider.
  - `footer::before` — the footer's wavy top edge, from `squiggle-edge.svg` (the original footer wave, filled).
- **End-of-list note** — a small inline SVG (`.mini-squiggle` in PostList), since it's always 160px wide.

The mask URLs are root-absolute (`/images/...`), which assumes the site is served from `/` (it is: custom domain, no `base`).

### Profile Image

Uses CSS `background-image: var(--display-picture)` where the URL values (including base path) are set as inline styles on `<html>` from BaseLayout.

## Content System

### Collection Schema (`content.config.ts`)

```typescript
schema: z.object({
  title: z.string(),
  date: z.coerce.date(),
  category: z.string().optional(),    // Free-form, lowercased; slug-safe; not a reserved top-level name
  excerpt: z.string().optional(),
  cover: z.string().optional(),       // Cover image path (base path auto-prepended); also the link-preview image
  draft: z.boolean().default(false),
  fullscreen: z.boolean().default(false), // Post's own component owns the whole window
})
```

### Post Card Features

- Optional cover image (with base path auto-prepended)
- Alternating tilt rotation (notebook feel)
- Numbered via CSS counters (01, 02, ...)
- Hover effect: straightens + shifts right + background tint

## Routing

| File | Route | Description |
|------|-------|-------------|
| `pages/index.astro` | `/` | Home page |
| `pages/posts/index.astro` + `pages/posts/page/[page].astro` | `/posts/`, `/posts/page/2/` | All posts (paginated) |
| `pages/[category]/[...page].astro` | `/art/`, `/plants/`, `/plants/2/` | One category (paginated) |
| `pages/posts/[...slug].astro` | `/posts/bigfoot` | Individual posts |
| `pages/404.astro` | any unknown URL | Not-found page |

Categories aren't a fixed list: `getCategories()` collects the categories used by published posts, and the dynamic route generates a page (and PostList a filter chip) for each. A post's category is optional; posts without one appear only under "all". Category names can't collide with other top-level routes or `public/` folders (`posts`, `photos`, ...); the schema rejects those with a clear error.

## Styling

### Design System

| Element | Value |
|---------|-------|
| Accent color | `#c23616` (rust/coral) |
| Font family | `Schoolbell` (cursive, hand-drawn) |
| Mobile breakpoint | `780px` |
| Layout | Flexbox, 30% sticky sidebar / content; document scrolls normally |
| Links | `--link-color` (purple) inside content |

### SCSS Architecture

- `global.scss` — CSS custom properties, page layout (+ fullscreen override), squiggles, responsive breakpoints
- `blog.scss` — Post card styles, filter chips, pagination, end-of-list note, back link

## Build & Deployment

### Commands

```bash
npm run dev      # Start dev server (localhost:4321)
npm run build    # Build for production (outputs to dist/)
npm run preview  # Preview production build
```

### Configuration (`astro.config.mjs`)

```javascript
export default defineConfig({
  site: 'https://squiggles.slesa.com.np',   // custom domain (public/CNAME), served from /
  integrations: [mdx(), sitemap(), svelte()],
});
```

### GitHub Actions

1. Trigger: Push to `main` branch
2. Build: Node.js 20, `npm ci`, `npm run build`
3. Deploy: Upload `dist/` to GitHub Pages

## Adding Content

### Standard Post

Create `src/content/posts/my-post.md`:

```markdown
---
title: My New Post
date: 2024-01-20
category: dev
cover: images/my-cover.jpg
---

Your content here...
```

### Interactive Post (MDX)

Create `src/content/posts/my-post.mdx`:

```mdx
---
title: Interactive Demo
date: 2024-01-20
category: dev
---

import MyComponent from '../../components/MyComponent.svelte';

<MyComponent client:visible />
```

**Reusable components** (already in `src/components/`, drop-in for any MDX post — no need to rebuild):

| Component | Purpose |
|-----------|---------|
| `PostImage.svelte` | Single image with photo-frame styling (slight tilt, border, optional caption). |
| `PostHeader.svelte` | Magazine-style header with kicker + title + description + optional hero image. |
| `Gallery.svelte` | Captioned image grid. |
| `Scrollytelling.svelte` | Generic scrollytelling: sticky image stack on the left, scrolling bubble steps on the right. See `ikea-greenhouse.mdx`. |
| `InstagramEmbed.svelte` | Single Instagram post embedded in a polaroid frame. Takes `url` and optional `tilt` (degrees). Idempotently loads `embed.js` once and re-runs `instgrm.Embeds.process()` per instance. See `saanostory-comics.mdx`. |

**Polaroid frame pattern.** Recurring motif — white background (`#fff`, locked, theme-independent), thick bottom padding (`14px 14px 3rem 14px`), 1px subtle border, deep box-shadow, slight rotation via a `--tilt` CSS variable so columns of polaroids can lean different directions. Currently lives in two components: `PeggyMartinScene.svelte` (`.gif-frame`) and `InstagramEmbed.svelte` (`.polaroid`). If you need it in a third place, consider extracting a shared `Polaroid.svelte`.

### Fullscreen Post

Set `fullscreen: true` in frontmatter to make the post own the entire viewport. `PostLayout.astro` then renders only `<slot />` — **no title, no back-link, no article chrome**. The post's Svelte component is responsible for everything visible.

Each fullscreen post gets its own dedicated scene component in `src/components/` (see `BigfootScrollytelling.svelte`, `GradScrollytelling.svelte`, `Scrollytelling.svelte`, `PeggyMartinScene.svelte`). They share a few conventions:

- **Back link** — render `<a class="back-link" href={backHref} onclick={handleBack}>&lt;&lt; go back</a>` pinned `position: fixed` top-left. Use `resolveBack('/posts/')` for the href (honors `BASE_URL`) and have `handleBack` call `goBack(e)` from `src/lib/back.ts` (see `Scrollytelling.svelte`). `goBack` only steps back in history when the previous page was on this site; otherwise the link goes to `/posts/`, so visitors arriving from Instagram or Google aren't sent off the site.
- **Title placement** — when needed, render the title as a small "chip" (rotated, bordered, accent-colored) positioned absolutely inside the scene rather than as an `<h1>` block (see `.title-overlay h1` in `Scrollytelling.svelte`, or `PeggyMartinScene.svelte` `.title-chip`).
- **Markdown in props** — caption/bubble text passed as plain string props can be processed inline with a small `mdInline(text)` helper (see any of the scrolly components) that handles `**bold**`, `*italic*`, links, and `\n`. Use `{@html mdInline(text)}` to render.
- **Frontmatter** — `fullscreen: true` plus optional `excerpt` (shown in post lists, not in the post itself).

Pattern for the MDX wrapper:

```mdx
---
title: My Fullscreen Post
date: 2026-05-19
category: make
excerpt: short tagline, used on post listing pages.
fullscreen: true
---

import MyScene from '../../components/MyScene.svelte';

<MyScene
  client:load
  title="my fullscreen post"
  /* ...other props the scene needs */
/>
```

### Assets

- **Images** → `public/images/`. Reference in components as `images/foo.webp` (no leading slash); scene components apply `BASE_URL` themselves.
- **Videos** → `public/videos/`. Prefer MP4 (h.264, `yuv420p`, even dimensions) over animated GIF — a typical timelapse gif shrinks 5-10× when re-encoded. Convert with:

  ```
  ffmpeg -i input.gif -vf "scale=-2:900" -c:v libx264 -pix_fmt yuv420p \
    -crf 23 -preset slow -movflags +faststart -an output.mp4
  ```

  Embed with `<video src=... autoplay loop muted playsinline preload="auto">` — no controls, infinite loop, works in Safari (`playsinline` is required).
- **Originals** (uncompressed source files) → `public/images/.originals/` and `public/videos/<post>/.originals/`. These are gitignored.

### Voice & Tone

Posts are written in a casual, lowercase, hand-drawn voice:
- Lowercase throughout (titles too, in the chip / bubble UI).
- Em-dashes (`—`) for asides and beats; sparse punctuation otherwise.
- Short sentences. Concrete nouns. Avoid catalog-speak ("mid-century pieces", "pre-loved garments") in favor of plain ("old furniture", "thrifted clothes").
- Match the tagline: *perfectly imperfect*. Hand-drawn aesthetic = a little tilt on frames, slightly rotated bubbles, photo-frame styling on images (see `PostImage.svelte` and `PeggyMartinScene.svelte`'s `.gif-frame`).

## Project Metadata

- **Repository**: slesaad/squiggly-lines
- **Author**: slesa
- **Company**: @saanostory ink.
- **Framework**: Astro 5.x
- **Node.js**: 20.x
