/**
 * Album cover that falls back to a 🎵 placeholder when the image is missing or
 * fails to load — instead of vanishing (which hid broken/uncached art and made
 * it look like nothing rendered). Keeps the same box so the layout stays stable.
 */

import { useEffect, useState } from "react";

interface AlbumArtProps {
  src?: string | null;
  alt?: string;
  /** Size/shape classes applied to BOTH the image and the placeholder box. */
  className?: string;
}

export function AlbumArt({
  src,
  alt = "Album art",
  className = "",
}: AlbumArtProps) {
  const [failed, setFailed] = useState(false);

  // A new src is a fresh attempt — clear any previous failure.
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div
        className={`grid place-items-center bg-gradient-to-br from-primary/40 via-cyan/20 to-neon/30 text-4xl ${className}`}
      >
        🎵
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
