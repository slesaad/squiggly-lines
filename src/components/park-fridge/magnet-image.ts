import type { Park } from '../../data/parks';
import { magnetImages } from '../../data/magnet-images';

// Width / height of the nominal magnet box that photo magnets are sized against.
export const MAGNET_ASPECT = 1.4;

// The cut-out photo of a park's magnet (see scripts/extract-magnets.mjs).
export const magnetImageFor = (park: Park) => magnetImages[park.id];

// Fits a photo of the given aspect to roughly the same area as a w x h box, so
// tall and round magnets aren't dwarfed by wide ones, while staying within a
// little over the box's width and height.
export function photoBox(w: number, h: number, aspect: number) {
  let pw = Math.sqrt(w * h * aspect);
  let ph = pw / aspect;
  const k = Math.min(1, (w * 1.15) / pw, (h * 1.45) / ph);
  pw *= k;
  ph *= k;
  return { w: pw, h: ph };
}
