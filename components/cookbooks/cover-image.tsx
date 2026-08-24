"use client";

import { useEffect, useRef, useState } from "react";

export function CoverImage({
  imageUrl,
  alt,
}: {
  imageUrl?: string | null;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // A same-tick SSR image load/error can resolve before React hydrates
    // and attaches onError, so re-check completed state on mount.
    if (imgRef.current?.complete && imgRef.current.naturalWidth === 0) {
      setFailed(true);
    }
  }, [imageUrl]);

  if (imageUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        src={imageUrl}
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="h-full w-full bg-gradient-to-br from-stone-300 via-stone-200 to-stone-400" />
  );
}
