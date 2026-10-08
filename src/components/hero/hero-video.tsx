"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroMedia } from "@/lib/data";

/* Admin-managed hero video, streamed from Mux with adaptive quality.
   Behaves like a surface, not a player: muted, looping, inline, no controls,
   fades in only once frames are actually playing (the poster holds until then).
   Phones get the vertical cut when admin has uploaded one.
   Only data-saver gets the poster still. "Reduce motion" (switched on by default on many
   Windows PCs) still plays it: it's a slow, silent backdrop, and the scroll zoom is
   already switched off for those visitors. */

export function HeroVideo({ media, className }: { media: NonNullable<HeroMedia>; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [stillOnly, setStillOnly] = useState(false);

  const [playbackId, setPlaybackId] = useState(media.playbackId);
  const poster = media.posterUrl ?? `https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=1600`;

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    // Deciding still-vs-stream needs browser-only signals, so it happens after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (conn?.saveData) setStillOnly(true);
    if (media.mobilePlaybackId && window.matchMedia("(max-width: 767px)").matches) setPlaybackId(media.mobilePlaybackId);
  }, [media.mobilePlaybackId]);

  useEffect(() => {
    const video = ref.current;
    if (!video || stillOnly) return;
    // browsers only autoplay silent video: set it on the element itself, not just the attribute
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");

    const src = `https://stream.mux.com/${playbackId}.m3u8`;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    const tryPlay = () => {
      if (!cancelled && video.paused) video.play().catch(() => {});
    };

    const native = () => {
      video.src = src;
      video.load();
      tryPlay();
    };

    // Apple's built-in player is the best on iPhone/iPad/Safari. Newer desktop Chrome and Edge
    // also *claim* they can play this stream ("maybe") but often stall, so everyone else
    // streams through hls.js.
    const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg|OPR|Firefox|Android/.test(navigator.userAgent)) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
    if (apple && video.canPlayType("application/vnd.apple.mpegurl")) {
      native();
    } else {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (!Hls.isSupported()) return native();
          const hls = new Hls({ capLevelToPlayerSize: true, startLevel: -1, maxBufferLength: 12 });
          let recovered = false;
          hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (!data.fatal) return;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
            else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recovered) {
              recovered = true;
              hls.recoverMediaError();
            } else {
              hls.destroy();
              native();
            }
          });
          hls.loadSource(src);
          hls.attachMedia(video);
          destroy = () => hls.destroy();
        })
        .catch(native);
    }

    // belt and braces: retry when there's enough to play, when the tab comes back,
    // and on the first touch/scroll if a browser held autoplay back
    const onVisible = () => document.visibilityState === "visible" && tryPlay();
    video.addEventListener("canplay", tryPlay);
    document.addEventListener("visibilitychange", onVisible);
    const once = { once: true, passive: true } as const;
    window.addEventListener("pointerdown", tryPlay, once);
    window.addEventListener("scroll", tryPlay, once);
    window.addEventListener("keydown", tryPlay, { once: true });

    return () => {
      cancelled = true;
      destroy?.();
      video.removeEventListener("canplay", tryPlay);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("scroll", tryPlay);
      window.removeEventListener("keydown", tryPlay);
    };
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
          poster={poster}
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
