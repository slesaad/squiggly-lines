import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { readdirSync } from 'node:fs';

// Category pages live at the site root (/art/, /plants/, ...), so a category
// can't share a name with another top-level route or a folder in public/.
const RESERVED = new Set(['posts', '404', '_astro', ...readdirSync('./public')]);

const category = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'category must be letters, numbers and dashes, e.g. "plants" or "road-trips"')
  .refine((c) => !RESERVED.has(c), (c) => ({
    message: `category "${c}" is taken by another page or folder at /${c}/; pick another name`,
  }));

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // Any name you like; its page and filter chip appear automatically. Optional.
    category: category.optional(),
    excerpt: z.string().optional(),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
    fullscreen: z.boolean().default(false),
  }),
});

export const collections = { posts };
