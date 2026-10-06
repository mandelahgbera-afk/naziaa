"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroMedia } from "@/lib/data";

/* Admin-managed hero video, streamed from Mux with adaptive quality.
   Behaves like a surface, not a player: muted, looping, inline, no controls,
   fades in only once frames are actually playing (the poster holds until then).
   Phones get the vertical cut when admin has uploaded one.
   Reduced motion or data-saver → the poster still, no stream at all. */

export function HeroVideo({ media, className }: { media: NonNullable<HeroMedia>; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [stillOnly, setStillOnly] = useState(false);

  const [playbackId, setPlaybackId] = useState(media.playbackId);
  const poster = media.posterUrl ?? `https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=1600`;

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Deciding still-vs-stream needs browser-only signals, so it happens after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (reduce || conn?.saveData) setStillOnly(true);
    if (media.mobilePlaybackId && window.matchMedia("(max-width: 767px)").matches) setPlaybackId(media.mobilePlaybackId);
  }, [media.mobilePlaybackId]);

  useEffect(() => {
    const video = ref.current;
    if (!video || stillOnly) return;
    const src = `https://stream.mux.com/${playbackId}.m3u8`;
    let destroy: (() => void) | undefined;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) return;
        const hls = new Hls({ capLevelToPlayerSize: true, startLevel: -1, maxBufferLength: 12 });
        hls.loadSource(src);
        hls.attachMedia(video);
        destroy = () => hls.destroy();
      });
    }
    video.play().catch(() => {});
    return () => destroy?.();
  }, [playbackId, stillOnly]);

  return (
    <div
      className={className}
      style={{
        backgroundImage: `url(${poster})`,
        backgroundSize: "cover",
        backgroundPosition: `${media.focalX * 100}% ${media.focalY * 100}%`,
      }}
    >
      {!stillOnly && (
        <video
          ref={ref}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          className="h-full w-full object-cover transition-opacity duration-[1600ms] ease-[var(--ease-silk)]"
          style={{ opacity: playing ? 1 : 0, objectPosition: `${media.focalX * 100}% ${media.focalY * 100}%` }}
        />
      )}
    </div>
  );
}
