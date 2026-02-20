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
│       ├── cool.png         # Profile image (light theme)
│       ├── sleepy.png       # Profile image (dark theme)
│       └── icons/           # Social media icons
├── src/
│   ├── components/
│   │   ├── Header.astro     # Site header with squiggly line
│   │   ├── Footer.astro     # Site footer with squiggly line
│   │   ├── Sidebar.astro    # Profile, social links, nav, theme toggle
│   │   ├── ThemeToggle.astro # Dark/light mode toggle button
│   │   ├── PostCard.astro   # Blog post preview card
│   │   └── Pagination.astro # Prev/next navigation
│   ├── layouts/
│   │   ├── BaseLayout.astro # Master layout (header, sidebar, footer, theme init)
│   │   └── PostLayout.astro # Individual post layout (back link, article, date)
│   ├── pages/
│   │   ├── index.astro      # Home page
│   │   ├── blog/[...page].astro         # All posts (paginated)
│   │   ├── [category]/[...page].astro   # Dynamic category route (art/dev/make/misc)
│   │   └── posts/[...slug].astro        # Individual post pages
│   ├── content/
│   │   └── posts/           # Blog posts (Markdown/MDX)
│   ├── styles/
│   │   ├── global.scss      # CSS variables, layout, typography, responsive
│   │   └── blog.scss        # Post cards, pagination, back link
│   ├── consts.ts            # Site config, social links, categories, getBase()
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
BaseLayout.astro (Master Layout)
├── <head>
│   ├── Meta tags, Google Fonts, Global styles
│   └── Theme flash prevention script (reads localStorage)
├── <html> (sets --display-picture-light/dark CSS vars from base path)
├── Header.astro
│   ├── Site title + tagline
│   └── SVG squiggly line (stroke="currentColor")
├── <div class="main">
│   ├── Sidebar.astro
│   │   ├── Profile image (CSS background-image, swaps per theme)
│   │   ├── Social links
│   │   ├── Category nav (active state highlighted)
│   │   └── ThemeToggle.astro (sun/moon button)
│   └── Content Wrapper
│       ├── Category tag pill (optional, e.g. #art)
│       └── <slot /> (page content)
└── Footer.astro
    ├── SVG squiggly line (fill="currentColor")
    └── Copyright

PostLayout.astro (extends BaseLayout)
├── Back link (<< go back)
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
| `--bg-color` | `white` | `#1a1a2e` |
| `--footer-bg` | `black` | `#0f0f1a` |
| `--link-color` | `purple` | `#bb86fc` |
| `--squiggly-color` | `black` | `#e0e0e0` |
| `--display-picture` | `cool.png` | `sleepy.png` |

### SVG Adaptation

SVG squiggly lines use `currentColor` for stroke/fill, inheriting from CSS `color` property which is set via theme variables.

### Profile Image

Uses CSS `background-image: var(--display-picture)` where the URL values (including base path) are set as inline styles on `<html>` from BaseLayout.

## Content System

### Collection Schema (`content.config.ts`)

```typescript
schema: z.object({
  title: z.string(),
  date: z.coerce.date(),
  category: z.enum(['art', 'dev', 'make', 'misc']),
  excerpt: z.string().optional(),
  cover: z.string().optional(),       // Cover image path (base path auto-prepended)
  draft: z.boolean().default(false),
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
| `pages/blog/[...page].astro` | `/blog`, `/blog/2` | All posts (paginated) |
| `pages/[category]/[...page].astro` | `/art`, `/dev`, `/make`, `/misc` | Dynamic category (paginated) |
| `pages/posts/[...slug].astro` | `/posts/bigfoot` | Individual posts |

Categories are defined in `consts.ts` as `CATEGORIES` array. The single dynamic route generates pages for all categories.

## Styling

### Design System

| Element | Value |
|---------|-------|
| Accent color | `#c23616` (rust/coral) |
| Font family | `Schoolbell` (cursive, hand-drawn) |
| Mobile breakpoint | `780px` |
| Layout | Flexbox, 35%/65% sidebar/content split |
| Links | Purple with colon decorators (`:link:`) |

### SCSS Architecture

- `global.scss` — CSS custom properties, base layout, responsive breakpoints
- `blog.scss` — Post card styles, back link, pagination

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
  site: 'https://slesaad.github.io',
  base: '/squiggly-lines',
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

## Project Metadata

- **Repository**: slesaad/squiggly-lines
- **Author**: slesa
- **Company**: @saanostory ink.
- **Framework**: Astro 5.x
- **Node.js**: 20.x
