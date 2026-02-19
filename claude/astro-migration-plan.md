# Jekyll to Astro Migration Plan

## Overview

This document outlines the migration from Jekyll to Astro for the squiggly-lines blog. The migration enables interactive content (scrollytelling, map visualizations) while preserving the existing design.

**Estimated effort**: 3-4 hours
**Risk level**: Low (small codebase, straightforward content)

---

## Pre-Migration Checklist

- [ ] Backup current repository (create a branch)
- [ ] Document current live site URLs for testing
- [ ] Note any Jekyll-specific features in use

---

## Step 1: Initialize Astro Project

**Time: ~15 minutes**

### 1.1 Create new Astro project in a separate directory

```bash
# From parent directory
npm create astro@latest squiggly-lines-astro -- --template minimal

cd squiggly-lines-astro
```

### 1.2 Install required dependencies

```bash
# Core dependencies
npm install @astrojs/mdx @astrojs/sitemap

# For interactive content (future use)
npm install @astrojs/svelte svelte  # or @astrojs/react react react-dom

# For SCSS support
npm install sass
```

### 1.3 Update `astro.config.mjs`

```javascript
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';  // or react

export default defineConfig({
  site: 'https://slesaad.github.io',
  base: '/squiggly-lines',
  integrations: [mdx(), sitemap(), svelte()],
});
```

---

## Step 2: Set Up Directory Structure

**Time: ~10 minutes**

### 2.1 Create Astro directory structure

```
src/
├── components/
│   ├── Header.astro
│   ├── Footer.astro
│   ├── Sidebar.astro
│   ├── PostCard.astro
│   └── Pagination.astro
├── layouts/
│   ├── BaseLayout.astro      # equivalent to default.html
│   ├── BlogLayout.astro      # equivalent to blog.html
│   └── PostLayout.astro      # equivalent to post.html
├── pages/
│   ├── index.astro           # home page
│   ├── blog/
│   │   └── [...page].astro   # paginated blog listing
│   ├── art/
│   │   └── [...page].astro   # art category
│   ├── dev/
│   │   └── [...page].astro   # dev category
│   ├── make/
│   │   └── [...page].astro   # make category
│   ├── misc/
│   │   └── [...page].astro   # misc category
│   └── posts/
│       └── [...slug].astro   # individual post pages
├── content/
│   └── posts/                # all blog posts go here
│       ├── bigfoot.md
│       ├── book-stand.md
│       └── art-desk.md
├── styles/
│   ├── global.scss           # from _sass/style.scss
│   ├── blog.scss             # from _sass/blog.scss
│   └── syntax.css            # code highlighting
└── consts.ts                 # site configuration
```

### 2.2 Copy static assets

```bash
# Copy from Jekyll project
cp -r assets/images/ public/images/
cp assets/css/syntax.css src/styles/
```

---

## Step 3: Create Site Configuration

**Time: ~5 minutes**

### 3.1 Create `src/consts.ts`

```typescript
// Site configuration (replaces _config.yml)
export const SITE = {
  name: 'squiggly lines',
  title: 'squiggly lines',
  tagline: 'perfectly imperfect',
  author: 'slesa',
  company: '@saanostory ink.',
};

export const SOCIAL = {
  instagram: 'https://www.instagram.com/saanostory/',
  github: 'https://github.com/slesaad/',
  email: 'mailto:slesaad@gmail.com',
  website: 'https://slesa.com.np',
  linkedin: 'https://linkedin.com/in/slesaad',
};

export const PAGINATION = {
  perPage: 8,
};

export const CATEGORIES = ['art', 'dev', 'make', 'misc'] as const;
export type Category = typeof CATEGORIES[number];
```

---

## Step 4: Convert Layouts

**Time: ~45 minutes**

### 4.1 Create `src/layouts/BaseLayout.astro`

Convert from `_layouts/default.html`:

```astro
---
import '../styles/global.scss';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import Sidebar from '../components/Sidebar.astro';

interface Props {
  title?: string;
}

const { title } = Astro.props;
---

<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Yomogi&family=Comforter+Brush&family=Mansalva&family=Schoolbell&family=Comic+Neue&display=swap" rel="stylesheet" />
    <title>{title ?? 'squiggly lines'}</title>
  </head>
  <body>
    <Header />
    <div class="main">
      <Sidebar />
      <div class="content-wrapper">
        <div class="content">
          <slot />
        </div>
      </div>
    </div>
    <Footer />
  </body>
</html>
```

### 4.2 Create `src/components/Header.astro`

```astro
---
import { SITE } from '../consts';
---

<header>
  <a href="/">
    {SITE.name}
    <div class="tag">{SITE.tagline}</div>
  </a>
  <div class="header-squiggly-line">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20" preserveAspectRatio="none">
      <path d="M0 10 C 10 0, 20 20, 30 10 S 50 10, 60 20, 80 0, 100 10" stroke="black" fill="transparent" stroke-width="2"/>
    </svg>
  </div>
</header>
```

### 4.3 Create `src/components/Sidebar.astro`

```astro
---
import { SOCIAL } from '../consts';
---

<div class="sidebar">
  <div>
    <a href="/"><img class="profile-image" src="/images/cool.png" /></a>
  </div>
  <div class="social">
    <a href={SOCIAL.instagram}><img class="icon insta" src="/images/icons/insta.png" alt="instagram" /></a>
    <a href={SOCIAL.github}><img class="icon github" src="/images/icons/github.png" alt="github" /></a>
    <a href={SOCIAL.website}><img class="icon website" src="/images/icons/web.png" alt="website" /></a>
    <a href={SOCIAL.email}><img class="icon email" src="/images/icons/email.png" alt="email" /></a>
    <a href={SOCIAL.linkedin}><img class="icon linkedin" src="/images/icons/linkedin.png" alt="linkedin" /></a>
  </div>
  <div class="menu">
    <a href="/blog" class="all">all</a>
    <a href="/art">art</a>
    <a href="/dev">dev</a>
    <a href="/make">make</a>
    <a href="/misc">misc</a>
  </div>
</div>
```

### 4.4 Create `src/components/Footer.astro`

```astro
---
import { SITE } from '../consts';
---

<footer class="footer">
  <div class="squiggly-line">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20" preserveAspectRatio="none">
      <path d="M0 10 C 5 0, 15 20, 25 10 S 35 0, 45 10 S 55 20, 65 10 S 75 0, 85 10 S 95 20, 100 10" stroke="none" fill="black" />
    </svg>
  </div>
  <div class="footer-content">
    {SITE.company} &copy; 2021 by {SITE.author}
  </div>
</footer>
```

### 4.5 Create `src/layouts/PostLayout.astro`

```astro
---
import BaseLayout from './BaseLayout.astro';
import type { CollectionEntry } from 'astro:content';

interface Props {
  post: CollectionEntry<'posts'>;
}

const { post } = Astro.props;
const { title, date } = post.data;

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
---

<BaseLayout title={title}>
  <article class="post">
    <h1>{title}</h1>
    <div class="entry">
      <slot />
    </div>
    <div class="date">
      Written on {formatDate(date)}
    </div>
  </article>
</BaseLayout>
```

---

## Step 5: Set Up Content Collections

**Time: ~20 minutes**

### 5.1 Create `src/content/config.ts`

```typescript
import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    category: z.enum(['art', 'dev', 'make', 'misc']),
    excerpt: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
```

### 5.2 Migrate posts to `src/content/posts/`

Convert Jekyll front matter to Astro format:

**Before (Jekyll):** `dev/_posts/2021-10-12-bigfoot.md`
```yaml
---
layout: post
title: Bigfoot
categories: dev
---
```

**After (Astro):** `src/content/posts/bigfoot.md`
```yaml
---
title: Bigfoot
date: 2021-10-12
category: dev
---
```

### 5.3 Migrate all 3 posts

| Jekyll Path | Astro Path |
|-------------|------------|
| `dev/_posts/2021-10-12-bigfoot.md` | `src/content/posts/bigfoot.md` |
| `make/_posts/2021-10-13-art-desk.md` | `src/content/posts/art-desk.md` |
| `make/_posts/2021-10-13-book-stand.md` | `src/content/posts/book-stand.md` |

---

## Step 6: Create Page Routes

**Time: ~30 minutes**

### 6.1 Create `src/pages/index.astro` (Home page)

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout>
  <p>
    Hi there! My name is Slesa and I'm a human. I like to build things, both
    tangible and non-tangible. I write code, build apps, design stuff, draw
    art and make all kinds of random things. Here I share my projects, my art
    and my adventures. Enjoy!
  </p>
</BaseLayout>
```

### 6.2 Create `src/pages/blog/[...page].astro` (Paginated blog)

```astro
---
import type { GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import Pagination from '../../components/Pagination.astro';
import { PAGINATION } from '../../consts';

export const getStaticPaths: GetStaticPaths = async ({ paginate }) => {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const sortedPosts = posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return paginate(sortedPosts, { pageSize: PAGINATION.perPage });
};

const { page } = Astro.props;
---

<BaseLayout title="All Posts">
  <div>
    {page.data.map((post) => (
      <PostCard post={post} />
    ))}
    <Pagination page={page} />
  </div>
</BaseLayout>
```

### 6.3 Create `src/pages/[category]/[...page].astro` (Category pages)

```astro
---
import type { GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import Pagination from '../../components/Pagination.astro';
import { PAGINATION, CATEGORIES } from '../../consts';

export const getStaticPaths: GetStaticPaths = async ({ paginate }) => {
  const posts = await getCollection('posts', ({ data }) => !data.draft);

  return CATEGORIES.flatMap((category) => {
    const categoryPosts = posts
      .filter((post) => post.data.category === category)
      .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

    return paginate(categoryPosts, {
      params: { category },
      pageSize: PAGINATION.perPage,
    });
  });
};

const { category } = Astro.params;
const { page } = Astro.props;
---

<BaseLayout title={category}>
  <div>
    {page.data.map((post) => (
      <PostCard post={post} />
    ))}
    <Pagination page={page} />
  </div>
</BaseLayout>
```

### 6.4 Create `src/pages/posts/[...slug].astro` (Individual posts)

```astro
---
import type { GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import PostLayout from '../../layouts/PostLayout.astro';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('posts');
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
};

const { post } = Astro.props;
const { Content } = await post.render();
---

<PostLayout post={post}>
  <Content />
</PostLayout>
```

### 6.5 Create `src/components/PostCard.astro`

```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  post: CollectionEntry<'posts'>;
}

const { post } = Astro.props;

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
---

<article class="post">
  <a href={`/posts/${post.slug}`} class="title">
    <h1>&gt;&gt; {post.data.title}</h1>
  </a>
  <div class="entry">
    {post.data.excerpt || post.body.slice(0, 150) + '...'}
    <span class="learn-more">
      <a href={`/posts/${post.slug}`}>learn more...</a>
    </span>
  </div>
  <div class="date">
    {formatDate(post.data.date)}
  </div>
</article>
```

### 6.6 Create `src/components/Pagination.astro`

```astro
---
interface Props {
  page: {
    url: {
      prev?: string;
      next?: string;
    };
  };
}

const { page } = Astro.props;
---

{(page.url.prev || page.url.next) && (
  <div>
    {page.url.prev && <a href={page.url.prev}>&lt;&lt; Prev</a>}
    |
    {page.url.next && <a href={page.url.next}>Next &gt;&gt;</a>}
  </div>
)}
```

---

## Step 7: Migrate Styles

**Time: ~10 minutes**

### 7.1 Copy SCSS to `src/styles/global.scss`

Copy `_sass/style.scss` content directly. SCSS works in Astro with no changes needed.

### 7.2 Copy blog styles to `src/styles/blog.scss`

Copy `_sass/blog.scss` content.

### 7.3 Import styles in BaseLayout

Already done in Step 4.1 with `import '../styles/global.scss';`

---

## Step 8: Update GitHub Actions

**Time: ~15 minutes**

### 8.1 Replace `.github/workflows/jekyll.yml` with Astro workflow

```yaml
name: Deploy Astro site to Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5

      - name: Build with Astro
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## Step 9: Clean Up

**Time: ~10 minutes**

### 9.1 Remove Jekyll files

After successful migration, delete:
- `_config.yml`
- `_layouts/`
- `_sass/`
- `_site/`
- `Gemfile`
- `Gemfile.lock`
- `docker-compose.yml` (or update for Astro)
- `Dockerfile` (or update for Astro)

### 9.2 Update `.gitignore`

```gitignore
# Astro
dist/
.astro/

# Dependencies
node_modules/

# Environment
.env
.env.*

# OS
.DS_Store
```

### 9.3 Remove TinaCMS (per requirements)

Delete:
- `tina/` directory
- TinaCMS dependencies from `package.json`

---

## Step 10: Test & Verify

**Time: ~30 minutes**

### 10.1 Local testing

```bash
npm run dev
```

Verify:
- [ ] Home page loads correctly
- [ ] All category pages work (`/art`, `/dev`, `/make`, `/misc`)
- [ ] Blog listing works (`/blog`)
- [ ] Pagination works
- [ ] Individual posts render correctly
- [ ] Styles match original design
- [ ] Responsive layout works
- [ ] All links work
- [ ] Images load

### 10.2 Build test

```bash
npm run build
npm run preview
```

### 10.3 Deploy test

Push to a test branch and verify GitHub Actions workflow succeeds.

---

## Post-Migration: Adding Interactive Content

Once migrated, you can create interactive posts using MDX:

### Example: Scrollytelling Post

Create `src/content/posts/interactive-story.mdx`:

```mdx
---
title: My Interactive Story
date: 2024-01-15
category: dev
---

import ScrollySection from '../../components/ScrollySection.svelte';

# Introduction

Regular markdown content here.

<ScrollySection client:visible>
  {/* Interactive scrollytelling content */}
</ScrollySection>

More markdown content...
```

### Example: Map Visualization

```mdx
---
title: Travel Map
date: 2024-01-20
category: art
---

import TravelMap from '../../components/TravelMap.svelte';

# My Travels

<TravelMap client:load locations={[
  { lat: 40.7128, lng: -74.0060, name: "New York" },
  { lat: 51.5074, lng: -0.1278, name: "London" }
]} />
```

---

## Migration Checklist Summary

- [ ] Step 1: Initialize Astro project
- [ ] Step 2: Set up directory structure
- [ ] Step 3: Create site configuration
- [ ] Step 4: Convert layouts (BaseLayout, Header, Sidebar, Footer, PostLayout)
- [ ] Step 5: Set up content collections and migrate posts
- [ ] Step 6: Create page routes (home, blog, categories, individual posts)
- [ ] Step 7: Migrate SCSS styles
- [ ] Step 8: Update GitHub Actions workflow
- [ ] Step 9: Clean up Jekyll files
- [ ] Step 10: Test and verify

---

## Files to Create (Summary)

| File | Purpose |
|------|---------|
| `astro.config.mjs` | Astro configuration |
| `src/consts.ts` | Site constants |
| `src/content/config.ts` | Content collection schema |
| `src/layouts/BaseLayout.astro` | Main layout |
| `src/layouts/PostLayout.astro` | Post layout |
| `src/components/Header.astro` | Header component |
| `src/components/Footer.astro` | Footer component |
| `src/components/Sidebar.astro` | Sidebar component |
| `src/components/PostCard.astro` | Post card component |
| `src/components/Pagination.astro` | Pagination component |
| `src/pages/index.astro` | Home page |
| `src/pages/blog/[...page].astro` | Blog listing |
| `src/pages/[category]/[...page].astro` | Category pages |
| `src/pages/posts/[...slug].astro` | Individual posts |
| `src/styles/global.scss` | Global styles |
| `.github/workflows/astro.yml` | CI/CD workflow |

---

## Rollback Plan

If migration fails:
1. Keep Jekyll files in a `jekyll-backup` branch
2. Revert to main branch with Jekyll setup
3. Re-enable Jekyll GitHub Actions workflow
