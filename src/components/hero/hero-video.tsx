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
  // the video's shape, read from a tiny Mux thumbnail before the stream starts so nothing jumps
  const [shape, setShape] = useState<"unknown" | "portrait" | "landscape">("unknown");
  const [wide, setWide] = useState(false);

  const [playbackId, setPlaybackId] = useState(media.playbackId);
  const poster = media.posterUrl ?? `https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=1600`;
  // a 48px frame stretched to fill the screen is a naturally soft wash: no live blur to redraw while scrolling
  const wash = `https://image.mux.com/${playbackId}/thumbnail.webp?time=0&width=48`;

  useEffect(() => {
    const img = new Image();
    img.onload = () => setShape(img.naturalHeight > img.naturalWidth * 1.05 ? "portrait" : "landscape");
    img.onerror = () => setShape("landscape");
    img.src = wash;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [wash]);

  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    // Deciding still-vs-stream needs browser-only signals, so it happens after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (conn?.saveData) setStillOnly(true);
    if (media.mobilePlaybackId && window.matchMedia("(max-width: 767px)").matches) setPlaybackId(media.mobilePlaybackId);
    const mq = window.matchMedia("(min-width: 768px) and (min-aspect-ratio: 1/1)");
    setWide(mq.matches);
    const onChange = () => setWide(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
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

  // a tall (phone-shot) video on a wide screen: show it whole in an arch instead of cropping it
  const framed = shape === "portrait" && wide;
  // on computers, wait until the shape is known so the first frame appears in its final place
  const ready = playing && (!wide || shape !== "unknown");

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      {/* behind everything: the sharp still on phones, a soft wash of the same frame on computers */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${wide ? wash : poster})`,
          backgroundSize: "cover",
          backgroundPosition: `${media.focalX * 100}% ${media.focalY * 100}%`,
          transform: wide ? "scale(1.15)" : undefined,
        }}
      />
      {wide && <div aria-hidden className="absolute inset-0 bg-darker/25" />}
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
          className={
            framed
              ? "absolute top-1/2 right-[max(4vw,calc((100vw-80rem)/2+2rem))] aspect-[9/16] h-[min(78vh,760px)] -translate-y-[46%] rounded-t-full rounded-b-[28px] object-cover shadow-[0_40px_80px_-20px_rgba(20,10,4,.6)] ring-1 ring-white/10 transition-opacity duration-[1600ms] ease-[var(--ease-silk)]"
              : "relative h-full w-full object-cover transition-opacity duration-[1600ms] ease-[var(--ease-silk)]"
          }
          style={{ opacity: ready ? 1 : 0, objectPosition: `${media.focalX * 100}% ${media.focalY * 100}%` }}
        />
      )}
    </div>
  );
}
