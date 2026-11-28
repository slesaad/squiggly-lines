# Claude Documentation Index

This folder contains documentation for the Squiggly Lines project, intended to help AI assistants and developers understand the codebase.

## Documents

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | Complete architecture overview including technology stack, directory structure, component system, theming, routing, and content management |
| [astro-migration-plan.md](./astro-migration-plan.md) | Historical reference: step-by-step guide used to migrate from Jekyll to Astro |

## Quick Reference

### Project Summary

**Squiggly Lines** is an Astro-based personal blog with a hand-drawn aesthetic, featuring:
- Blog posts with an optional, free-form category; category pages and filter chips are generated from the categories posts use
- Dark/light theme with CSS custom properties and localStorage persistence
- Optional cover images on posts
- Interactive content via Svelte components in MDX
- SCSS-based styling with responsive design
- GitHub Pages deployment via Actions

### Key Files

| File | Purpose |
|------|---------|
| `astro.config.mjs` | Astro configuration (site URL, integrations) |
| `src/consts.ts` | Site constants (name, description, social links, pagination) and `getBase()` |
| `src/lib/posts.ts` | `getSortedPosts()`, `getCategories()`, `pageCount()` |
| `src/content.config.ts` | Content collection schema |
| `src/layouts/BaseLayout.astro` | Master page template (theme init, layout) |
| `src/components/ThemeToggle.astro` | Dark/light mode toggle |
| `src/styles/global.scss` | CSS variables, layout, responsive styles |
| `.github/workflows/astro.yml` | CI/CD pipeline |

### Common Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Adding Content

**Standard post** - Create `src/content/posts/my-post.md`:
```markdown
---
title: My Post
date: 2024-01-20
category: dev
cover: images/my-cover.jpg
excerpt: A short description
---
Content here...
```

**Interactive post** - Create `src/content/posts/my-post.mdx`:
```mdx
---
title: My Post
date: 2024-01-20
category: dev
---
import Component from '../../components/Component.svelte';

<Component client:visible />
```

**Fullscreen post** - Set `fullscreen: true` in frontmatter. `PostLayout` then renders only the slot — the post's Svelte component owns the entire viewport (back link, title placement, all chrome). Pattern: one dedicated scene component per fullscreen post (`BigfootScrollytelling`, `GradScrollytelling`, `PeggyMartinScene`). See **architecture.md → Adding Content → Fullscreen Post** for conventions (back-link, title chip, `mdInline` helper, mp4 over gif, voice & tone).

### Technology Stack

- **Astro** - Static site generator with islands architecture
- **Svelte** - Interactive components
- **MDX** - Markdown with JSX/components
- **SCSS + CSS Custom Properties** - Styling and theming
- **TypeScript** - Type safety
- **GitHub Actions + Pages** - CI/CD and hosting
