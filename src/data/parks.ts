// All 63 US national parks. A park with at least one visit is a magnet on the
// fridge; the rest render as empty slots on the map.
//
// To add a visited park: fill in its `visits`, photograph the magnet on white
// paper and run `npm run extract:magnets` (see scripts/extract-magnets.mjs),
// put the trip photo in public/photos/ (resized, metadata stripped), and rerun
// `npm run build:park-map` so the map layout accounts for the bigger pin.

export interface VisitPhoto {
  url: string; // the photo, or a video's poster frame
  video?: string; // short muted loop
  caption?: string;
}

export interface Visit {
  date?: string; // ISO year-month, e.g. "2024-10"
  note?: string; // 1-3 sentences
  photo?: VisitPhoto;
}

export interface Park {
  id: string;
  name: string;
  state: string;
  coordinates: [number, number]; // [lng, lat]
  visits?: Visit[];
}

// Visit dates, notes and photos are from the real trips.

export const parks: Park[] = [
  { id: 'acadia', name: 'Acadia', state: 'ME', coordinates: [-68.21, 44.35] },
  { id: 'american-samoa', name: 'American Samoa', state: 'AS', coordinates: [-170.68, -14.25] },
  { id: 'arches', name: 'Arches', state: 'UT', coordinates: [-109.57, 38.68], visits: [{ date: '2026-11', note: 'Delicate Arch at golden hour. A guy dropped his airpods in the big ditch and somehow recovered them!', photo: { url: '/photos/arches.jpg', caption: 'Delicate Arch' } }] },
  { id: 'badlands', name: 'Badlands', state: 'SD', coordinates: [-102.5, 43.75] },
  { id: 'big-bend', name: 'Big Bend', state: 'TX', coordinates: [-103.25, 29.25] },
  { id: 'biscayne', name: 'Biscayne', state: 'FL', coordinates: [-80.08, 25.65], visits: [{ date: '2023-03', note: 'Barely can say we made it; our boat ride to Boca Chita got cancelled two days in a row. :(', photo: { url: '/photos/biscayne.jpg', caption: 'the trail out' } }] },
  { id: 'black-canyon', name: 'Black Canyon of the Gunnison', state: 'CO', coordinates: [-107.72, 38.57] },
  { id: 'bryce-canyon', name: 'Bryce Canyon', state: 'UT', coordinates: [-112.18, 37.57], visits: [{ date: '2026-11', note: 'Hoodoos. Such a cute name.', photo: { url: '/photos/bryce-canyon.jpg', caption: 'golden hour' } }] },
  { id: 'canyonlands', name: 'Canyonlands', state: 'UT', coordinates: [-109.93, 38.2], visits: [{ date: '2026-11', note: 'Mesa Arch', photo: { url: '/photos/canyonlands.jpg', caption: 'the edge of it all' } }] },
  { id: 'capitol-reef', name: 'Capitol Reef', state: 'UT', coordinates: [-111.17, 38.2], visits: [{ date: '2026-11', note: 'Poor man\'s "narrows" within Grand Wash was surprisingly nice. ', photo: { url: '/photos/capitol-reef.jpg', caption: 'into the canyon' } }] },
  { id: 'carlsbad-caverns', name: 'Carlsbad Caverns', state: 'NM', coordinates: [-104.44, 32.17] },
  { id: 'channel-islands', name: 'Channel Islands', state: 'CA', coordinates: [-119.42, 34.01] },
  { id: 'congaree', name: 'Congaree', state: 'SC', coordinates: [-80.78, 33.78] },
  { id: 'crater-lake', name: 'Crater Lake', state: 'OR', coordinates: [-122.1, 42.94] },
  { id: 'cuyahoga-valley', name: 'Cuyahoga Valley', state: 'OH', coordinates: [-81.55, 41.24] },
  { id: 'death-valley', name: 'Death Valley', state: 'CA', coordinates: [-116.82, 36.24], visits: [{ date: '2022-03', note: 'Namaste.', photo: { url: '/photos/death-valley.jpg', caption: 'the badlands' } }] },
  { id: 'denali', name: 'Denali', state: 'AK', coordinates: [-150.5, 63.33] },
  { id: 'dry-tortugas', name: 'Dry Tortugas', state: 'FL', coordinates: [-82.87, 24.63] },
  { id: 'everglades', name: 'Everglades', state: 'FL', coordinates: [-80.93, 25.32], visits: [{ date: '2023-03', note: 'SO. MANY. Alligators.', photo: { url: '/photos/everglades.jpg', caption: 'alligator #9' } }] },
  { id: 'gates-of-the-arctic', name: 'Gates of the Arctic', state: 'AK', coordinates: [-153.3, 67.78] },
  { id: 'gateway-arch', name: 'Gateway Arch', state: 'MO', coordinates: [-90.19, 38.63] },
  { id: 'glacier', name: 'Glacier', state: 'MT', coordinates: [-114.0, 48.8] },
  { id: 'glacier-bay', name: 'Glacier Bay', state: 'AK', coordinates: [-137.0, 58.5] },
  { id: 'grand-canyon', name: 'Grand Canyon', state: 'AZ', coordinates: [-112.14, 36.06], visits: [{ date: '2025-07', note: 'Back on the rim in July with my sister and baby niece.', photo: { url: '/photos/grand-canyon-2025.jpg', caption: 'round two' } }, { date: '2021-03', note: 'Literal tears. So GRAND. Hiked a little way down Bright Angel and a long way back up.', photo: { url: '/photos/grand-canyon-2021.jpg', caption: 'feet up on the rim' } }] },
  { id: 'grand-teton', name: 'Grand Teton', state: 'WY', coordinates: [-110.8, 43.73] },
  { id: 'great-basin', name: 'Great Basin', state: 'NV', coordinates: [-114.3, 38.98] },
  { id: 'great-sand-dunes', name: 'Great Sand Dunes', state: 'CO', coordinates: [-105.51, 37.73] },
  { id: 'great-smoky-mountains', name: 'Great Smoky Mountains', state: 'TN', coordinates: [-83.53, 35.68], visits: [{ date: '2026-10', note: 'Peak fall color at Clingmans Dome. Didn\'t spot a bear tho :(', photo: { url: '/photos/great-smoky-mountains.jpg', caption: 'Clingmans Dome' } }] },
  { id: 'guadalupe-mountains', name: 'Guadalupe Mountains', state: 'TX', coordinates: [-104.87, 31.92] },
  { id: 'haleakala', name: 'Haleakalā', state: 'HI', coordinates: [-156.17, 20.72] },
  { id: 'hawaii-volcanoes', name: 'Hawaiʻi Volcanoes', state: 'HI', coordinates: [-155.2, 19.38], visits: [{ date: '2026-03', note: 'A volcano erupted WHILE we were there!!! Could not catch the lava, but it was still steaming after.', photo: { video: '/videos/parks/hawaii-volcanoes.mp4', url: '/photos/hawaii-volcanoes-poster.jpg', caption: 'Halemaʻumaʻu, steaming' } }] },
  { id: 'hot-springs', name: 'Hot Springs', state: 'AR', coordinates: [-93.05, 34.51] },
  { id: 'indiana-dunes', name: 'Indiana Dunes', state: 'IN', coordinates: [-87.05, 41.65] },
  { id: 'isle-royale', name: 'Isle Royale', state: 'MI', coordinates: [-88.55, 48.1] },
  { id: 'joshua-tree', name: 'Joshua Tree', state: 'CA', coordinates: [-115.9, 33.79] },
  { id: 'katmai', name: 'Katmai', state: 'AK', coordinates: [-155.0, 58.5] },
  { id: 'kenai-fjords', name: 'Kenai Fjords', state: 'AK', coordinates: [-149.65, 59.92] },
  { id: 'kings-canyon', name: 'Kings Canyon', state: 'CA', coordinates: [-118.55, 36.8], visits: [{ date: '2022-03', note: 'Snowy. Giant Trees. Alien world.', photo: { url: '/photos/kings-canyon.jpg', caption: 'inside a giant' } }] },
  { id: 'kobuk-valley', name: 'Kobuk Valley', state: 'AK', coordinates: [-159.28, 67.55] },
  { id: 'lake-clark', name: 'Lake Clark', state: 'AK', coordinates: [-153.42, 60.97] },
  { id: 'lassen-volcanic', name: 'Lassen Volcanic', state: 'CA', coordinates: [-121.51, 40.49] },
  { id: 'mammoth-cave', name: 'Mammoth Cave', state: 'KY', coordinates: [-86.1, 37.18], visits: [{ date: '2026-08', note: 'Fat Man\'s Misery was full for misery even for me.', photo: { url: '/photos/mammoth-cave.jpg', caption: 'underground' } }] },
  { id: 'mesa-verde', name: 'Mesa Verde', state: 'CO', coordinates: [-108.49, 37.18] },
  { id: 'mount-rainier', name: 'Mount Rainier', state: 'WA', coordinates: [-121.75, 46.85] },
  { id: 'new-river-gorge', name: 'New River Gorge', state: 'WV', coordinates: [-81.08, 38.07] },
  { id: 'north-cascades', name: 'North Cascades', state: 'WA', coordinates: [-121.2, 48.7] },
  { id: 'olympic', name: 'Olympic', state: 'WA', coordinates: [-123.5, 47.97] },
  { id: 'petrified-forest', name: 'Petrified Forest', state: 'AZ', coordinates: [-109.78, 35.07] },
  { id: 'pinnacles', name: 'Pinnacles', state: 'CA', coordinates: [-121.16, 36.48] },
  { id: 'redwood', name: 'Redwood', state: 'CA', coordinates: [-124.0, 41.3] },
  { id: 'rocky-mountain', name: 'Rocky Mountain', state: 'CO', coordinates: [-105.58, 40.4], visits: [{ date: '2021-09', note: 'Unplanned trip; can\'t remember what all we did.', photo: { url: '/photos/rocky-mountain.jpg', caption: 'Bear Lake' } }] },
  { id: 'saguaro', name: 'Saguaro', state: 'AZ', coordinates: [-110.5, 32.25] },
  { id: 'sequoia', name: 'Sequoia', state: 'CA', coordinates: [-118.68, 36.43], visits: [{ date: '2022-03', note: 'Felt very small standing next to General Sherman.', photo: { url: '/photos/sequoia.jpg', caption: 'Big Trees Trail' } }] },
  { id: 'shenandoah', name: 'Shenandoah', state: 'VA', coordinates: [-78.35, 38.53] },
  { id: 'theodore-roosevelt', name: 'Theodore Roosevelt', state: 'ND', coordinates: [-103.45, 46.97] },
  { id: 'virgin-islands', name: 'Virgin Islands', state: 'VI', coordinates: [-64.73, 18.33] },
  { id: 'voyageurs', name: 'Voyageurs', state: 'MN', coordinates: [-92.88, 48.5] },
  { id: 'white-sands', name: 'White Sands', state: 'NM', coordinates: [-106.17, 32.78] },
  { id: 'wind-cave', name: 'Wind Cave', state: 'SD', coordinates: [-103.48, 43.57] },
  { id: 'wrangell-st-elias', name: 'Wrangell–St. Elias', state: 'AK', coordinates: [-142.0, 61.0] },
  { id: 'yellowstone', name: 'Yellowstone', state: 'WY', coordinates: [-110.5, 44.6] },
  { id: 'yosemite', name: 'Yosemite', state: 'CA', coordinates: [-119.5, 37.83], visits: [{ date: '2022-03', note: 'Half dome at sunset. Chef\'s kiss.', photo: { url: '/photos/yosemite.jpg', caption: 'Half Dome alpenglow' } }] },
  { id: 'zion', name: 'Zion', state: 'UT', coordinates: [-113.05, 37.3], visits: [{ date: '2025-07', note: 'Baby niece didn\'t care lol', photo: { url: '/photos/zion-2025.jpg', caption: 'still the favorite' } }, { date: '2021-03', note: 'Our little snowman at Angel\'s Landing had his day of fame.', photo: { url: '/photos/zion-2021.jpg', caption: 'snowman season' } }] },
];

export const isVisited = (p: Park) => (p.visits?.length ?? 0) > 0;
export const visitsNewestFirst = (p: Park) =>
  [...(p.visits ?? [])].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
