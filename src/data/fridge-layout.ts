// Hand-arranged magnet spots on the fridge door. Produced by the post's
// `?arrange` mode: drag magnets into place, press "copy layout", and paste the
// result over the object below. Parks missing here are placed automatically.
//
// x and y run 0..1 across the area a magnet's center can occupy; rotation is
// in degrees.

export interface FridgeSpot {
  x: number;
  y: number;
  rotation: number;
}

export const fridgeLayout: Record<string, FridgeSpot> = {
  'arches': { x: 1, y: 0.189, rotation: -2.1 },
  'biscayne': { x: 0.333, y: 0.659, rotation: 2.4 },
  'bryce-canyon': { x: 0.033, y: 0.558, rotation: 2.6 },
  'canyonlands': { x: 0.103, y: 0.344, rotation: 1.3 },
  'capitol-reef': { x: 0.045, y: 0, rotation: -1.4 },
  'death-valley': { x: 1, y: 0, rotation: -0.9 },
  'everglades': { x: 0.689, y: 0.208, rotation: 2.2 },
  'grand-canyon': { x: 1, y: 0.37, rotation: -3.8 },
  'great-smoky-mountains': { x: 0.663, y: 0, rotation: -0.9 },
  'hawaii-volcanoes': { x: 0.389, y: 0.205, rotation: -0.8 },
  'kings-canyon': { x: 0.696, y: 0.431, rotation: 2.5 },
  'mammoth-cave': { x: 0.386, y: 0.42, rotation: -0.6 },
  'rocky-mountain': { x: 0.675, y: 0.628, rotation: 0.1 },
  'sequoia': { x: 0.96, y: 0.591, rotation: -0.6 },
  'yosemite': { x: 0.044, y: 0.163, rotation: -2.4 },
  'zion': { x: 0.346, y: 0, rotation: 2.1 },
};
