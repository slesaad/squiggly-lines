#!/usr/bin/env bash
# Compresses every .mp4/.mov/.MOV in public/videos/CHG Videos/ (and bloopers/)
# in place. Originals are moved to .originals/ (gitignored) so they're
# recoverable but never deployed.
#
# Run only when ready to push/deploy. Requires ffmpeg (brew install ffmpeg).
set -euo pipefail

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found. Install with: brew install ffmpeg" >&2
  exit 1
fi

SRC="public/videos/CHG Videos"
TMP="$SRC/.compressed"
ORIG="$SRC/.originals"
mkdir -p "$TMP" "$TMP/bloopers" "$ORIG" "$ORIG/bloopers"

compress() {
  local in="$1" out="$2"
  echo "→ $in"
  ffmpeg -y -hide_banner -loglevel warning -i "$in" \
    -vf "scale='min(1280,iw)':-2" \
    -c:v libx264 -preset medium -crf 26 \
    -c:a aac -b:a 96k -movflags +faststart \
    "$out"
}

shopt -s nullglob nocaseglob
for f in "$SRC"/*.{mp4,mov}; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f")"
  out="$TMP/${base%.*}.mp4"
  compress "$f" "$out"
done

for f in "$SRC"/bloopers/*.{mp4,mov}; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f")"
  out="$TMP/bloopers/${base%.*}.mp4"
  compress "$f" "$out"
done
shopt -u nullglob nocaseglob

# Move originals aside
mv "$SRC"/*.{mp4,mov,MOV} "$ORIG"/ 2>/dev/null || true
mv "$SRC"/bloopers/*.{mp4,mov,MOV} "$ORIG"/bloopers/ 2>/dev/null || true

# Promote compressed
mv "$TMP"/*.mp4 "$SRC"/
mv "$TMP"/bloopers/*.mp4 "$SRC"/bloopers/
rmdir "$TMP/bloopers" "$TMP"

echo "Done. Originals preserved in $ORIG/"
