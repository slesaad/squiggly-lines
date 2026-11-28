import { getCollection } from 'astro:content';
import { PAGINATION } from '../consts';

/** Published posts, newest first. */
export async function getSortedPosts() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Categories used by at least one published post, alphabetically. */
export async function getCategories() {
  const posts = await getSortedPosts();
  const used = posts.map((p) => p.data.category).filter((c): c is string => !!c);
  return [...new Set(used)].sort();
}

/** Number of pages needed to list every published post. */
export function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / PAGINATION.perPage));
}
