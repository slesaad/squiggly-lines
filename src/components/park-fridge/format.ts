import { getBase } from '../../consts';

/** "2024-10" -> "October 2024"; a bare year passes through. */
export function formatMonth(date?: string): string {
  if (!date) return '';
  const [y, m] = date.split('-');
  return m ? new Date(+y, +m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : y;
}

/** [lng, lat] -> "38.68° N, 109.57° W" */
export function formatCoords([lng, lat]: [number, number]): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lng).toFixed(2)}° ${ew}`;
}

export const STATE_NAMES: Record<string, string> = {
  AK: 'Alaska',
  AR: 'Arkansas',
  AS: 'American Samoa',
  AZ: 'Arizona',
  CA: 'California',
  CO: 'Colorado',
  FL: 'Florida',
  HI: 'Hawaiʻi',
  IN: 'Indiana',
  KY: 'Kentucky',
  ME: 'Maine',
  MI: 'Michigan',
  MN: 'Minnesota',
  MO: 'Missouri',
  MT: 'Montana',
  ND: 'North Dakota',
  NM: 'New Mexico',
  NV: 'Nevada',
  OH: 'Ohio',
  OR: 'Oregon',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VA: 'Virginia',
  VI: 'U.S. Virgin Islands',
  WA: 'Washington',
  WV: 'West Virginia',
  WY: 'Wyoming',
};

export const resolveAsset = (path: string) =>
  /^https?:\/\//.test(path) ? path : getBase() + path.replace(/^\//, '');
