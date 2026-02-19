# Claude Documentation Index

This folder contains documentation for the Squiggly Lines project, intended to help AI assistants and developers understand the codebase.

## Documents

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | Complete architecture overview including technology stack, directory structure, component system, routing, and content management |
| [astro-migration-plan.md](./astro-migration-plan.md) | Historical reference: step-by-step guide used to migrate from Jekyll to Astro |

## Quick Reference

### Project Summary

**Squiggly Lines** is an Astro-based personal blog with a hand-drawn aesthetic, featuring:
- Multi-category blog posts (art, dev, make, misc)
- Interactive content via Svelte components in MDX
- SCSS-based styling with responsive design
- GitHub Pages deployment via Actions

### Key Files

| File | Purpose |
|------|---------|
| `astro.config.mjs` | Astro configuration (site, base URL, integrations) |
| `src/consts.ts` | Site constants and helper functions |
| `src/content.config.ts` | Content collection schema |
| `src/layouts/BaseLayout.astro` | Master page template |
| `src/styles/global.scss` | Main stylesheet |
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

### Technology Stack

- **Astro** - Static site generator with islands architecture
- **Svelte** - Interactive components
- **MDX** - Markdown with JSX/components
- **SCSS** - Styling
- **TypeScript** - Type safety
- **GitHub Actions + Pages** - CI/CD and hosting
