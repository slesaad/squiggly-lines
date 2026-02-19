# Squiggly Lines - Architecture Document

## Overview

Squiggly Lines is an Astro-based personal blog/portfolio site for documenting projects, art, and life events. It features a distinctive hand-drawn aesthetic with custom SVG squiggly line decorations and supports interactive content through Svelte components.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Static Generator | Astro | Site building, routing, and content collections |
| Interactive Components | Svelte | Client-side interactivity (hydrated islands) |
| Content Format | MDX | Markdown with embedded components |
| Styling | SCSS | CSS preprocessing |
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
│       ├── cool.png         # Profile image
│       └── icons/           # Social media icons
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Header.astro     # Site header with squiggly line
│   │   ├── Footer.astro     # Site footer with squiggly line
│   │   ├── Sidebar.astro    # Profile, social links, navigation
│   │   ├── PostCard.astro   # Blog post preview card
│   │   ├── Pagination.astro # Prev/next navigation
│   │   └── Counter.svelte   # Example interactive component
│   ├── layouts/
│   │   ├── BaseLayout.astro # Master layout (header, sidebar, footer)
│   │   └── PostLayout.astro # Individual post layout
│   ├── pages/               # File-based routing
│   │   ├── index.astro      # Home page
│   │   ├── blog/[...page].astro    # All posts (paginated)
│   │   ├── art/[...page].astro     # Art category
│   │   ├── dev/[...page].astro     # Dev category
│   │   ├── make/[...page].astro    # Make category
│   │   ├── misc/[...page].astro    # Misc category
│   │   └── posts/[...slug].astro   # Individual post pages
│   ├── content/
│   │   └── posts/           # Blog posts (Markdown/MDX)
│   │       ├── bigfoot.md
│   │       ├── art-desk.md
│   │       ├── book-stand.md
│   │       └── interactive-demo.mdx
│   ├── styles/
│   │   ├── global.scss      # Global styles
│   │   └── blog.scss        # Blog-specific styles
│   ├── consts.ts            # Site configuration and helpers
│   └── content.config.ts    # Content collection schema
├── .github/workflows/
│   └── astro.yml            # GitHub Actions deployment
└── claude/                  # Documentation
    ├── index.md
    ├── architecture.md
    └── astro-migration-plan.md
```

## Component Architecture

### Layout Hierarchy

```
BaseLayout.astro (Master Layout)
├── <head>
│   ├── Meta tags
│   ├── Google Fonts
│   └── Global styles (SCSS)
├── Header.astro
│   ├── Site title + tagline
│   └── SVG squiggly line decoration
├── <div class="main">
│   ├── Sidebar.astro
│   │   ├── Profile image
│   │   ├── Social links (Instagram, GitHub, etc.)
│   │   └── Navigation menu (all, art, dev, make, misc)
│   └── Content Wrapper
│       └── <slot /> (page content)
└── Footer.astro
    ├── SVG squiggly line decoration
    └── Copyright

PostLayout.astro (extends BaseLayout)
└── Article wrapper
    ├── Title
    ├── <slot /> (post content)
    └── Date
```

### Component Types

| Type | Extension | Purpose |
|------|-----------|---------|
| Astro | `.astro` | Static components (no JS shipped) |
| Svelte | `.svelte` | Interactive components (hydrated) |

## Content System

### Content Collections

Defined in `src/content.config.ts`:

```typescript
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(['art', 'dev', 'make', 'misc']),
    excerpt: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});
```

### Post Types

| Extension | Features |
|-----------|----------|
| `.md` | Standard Markdown posts |
| `.mdx` | Markdown + interactive Svelte/React components |

### Creating Interactive Posts

```mdx
---
title: My Interactive Post
date: 2024-01-15
category: dev
---

import Counter from '../../components/Counter.svelte';

# Hello World

<Counter client:visible />
```

### Hydration Directives

| Directive | Behavior |
|-----------|----------|
| `client:load` | Hydrate immediately on page load |
| `client:idle` | Hydrate when browser is idle |
| `client:visible` | Hydrate when scrolled into view |
| `client:media` | Hydrate based on media query |

## Routing

### File-Based Routes

| File | Route | Description |
|------|-------|-------------|
| `pages/index.astro` | `/` | Home page |
| `pages/blog/[...page].astro` | `/blog`, `/blog/2` | All posts (paginated) |
| `pages/art/[...page].astro` | `/art`, `/art/2` | Art category |
| `pages/dev/[...page].astro` | `/dev` | Dev category |
| `pages/make/[...page].astro` | `/make` | Make category |
| `pages/misc/[...page].astro` | `/misc` | Misc category |
| `pages/posts/[...slug].astro` | `/posts/bigfoot` | Individual posts |

### Pagination

Each category page uses Astro's built-in pagination:

```typescript
export const getStaticPaths: GetStaticPaths = async ({ paginate }) => {
  const posts = await getCollection('posts', ({ data }) =>
    !data.draft && data.category === 'dev'
  );
  return paginate(sortedPosts, { pageSize: 8 });
};
```

## Configuration

### `astro.config.mjs`

```javascript
export default defineConfig({
  site: 'https://slesaad.github.io',
  base: '/squiggly-lines',
  integrations: [mdx(), sitemap(), svelte()],
});
```

### `src/consts.ts`

```typescript
// Helper for base URL with trailing slash
export function getBase(): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? base : base + '/';
}

export const SITE = {
  name: 'squiggly lines',
  tagline: 'perfectly imperfect',
  author: 'slesa',
  company: '@saanostory ink.',
};

export const SOCIAL = { /* social links */ };
export const PAGINATION = { perPage: 8 };
export const CATEGORIES = ['art', 'dev', 'make', 'misc'] as const;
```

## Styling

### SCSS Architecture

```
src/styles/
├── global.scss    # Layout, typography, responsive design
└── blog.scss      # Post cards, pagination, article styles
```

### Design System

| Element | Value |
|---------|-------|
| Accent color | `#c23616` (rust/coral) |
| Font family | `Schoolbell` (cursive, hand-drawn) |
| Mobile breakpoint | `780px` |
| Layout | Flexbox, 35%/65% sidebar/content split |

## Build Process

### Commands

```bash
npm run dev      # Start dev server (localhost:4321)
npm run build    # Build for production (outputs to dist/)
npm run preview  # Preview production build
```

### Build Output

- Static HTML pages
- Optimized CSS (inlined)
- JavaScript bundles (only for interactive components)
- Sitemap XML

## Deployment

### GitHub Actions (`.github/workflows/astro.yml`)

1. **Trigger**: Push to `main` branch
2. **Build Job**:
   - Checkout code
   - Setup Node.js 20
   - Install dependencies (`npm ci`)
   - Build with Astro (`npm run build`)
   - Upload artifact (`dist/`)
3. **Deploy Job**:
   - Deploy to GitHub Pages

## Adding New Content

### Standard Blog Post

Create `src/content/posts/my-post.md`:

```markdown
---
title: My New Post
date: 2024-01-20
category: dev
---

Your content here...
```

### Interactive Post

Create `src/content/posts/my-interactive-post.mdx`:

```mdx
---
title: Interactive Demo
date: 2024-01-20
category: dev
---

import MyComponent from '../../components/MyComponent.svelte';

# Title

<MyComponent client:visible />
```

### New Svelte Component

Create `src/components/MyComponent.svelte`:

```svelte
<script>
  let count = $state(0);
</script>

<button onclick={() => count++}>
  Clicked {count} times
</button>
```

## Project Metadata

- **Repository**: slesaad/squiggly-lines
- **Author**: slesa
- **Company**: @saanostory ink.
- **Framework**: Astro 5.x
- **Node.js**: 20.x
