// Helper to get base URL with trailing slash
export function getBase(): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? base : base + '/';
}

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
export type Category = (typeof CATEGORIES)[number];
