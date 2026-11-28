import { getCollection } from 'astro:content';
import { PAGINATION } from '../consts';

/** Published posts, newest first. */
export async function getSortedPosts() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Number of pages needed to list every published post. */
export function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / PAGINATION.perPage));
}
