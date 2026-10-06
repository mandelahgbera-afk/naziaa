"use client";

import { useEffect, useRef, useState } from "react";
import { setHeroLive, startHeroUpload, updateHero } from "@/app/admin/actions";
import { HeroVideo } from "@/components/hero/hero-video";
import { Card, Empty, input, label } from "./ui";
import { useAction } from "./use-action";

type V = {
  id: string;
  title: string;
  playback_id: string | null;
  mobile_playback_id: string | null;
  status: string;
  tint: number;
  focal_x: number;
  focal_y: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
};

const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

export function HeroManager({ videos }: { videos: V[] }) {
  return (
    <div className="space-y-6">
      <Uploader />
      {videos.length ? videos.map((v) => <HeroCard key={v.id} v={v} />) : <Empty>No hero videos yet.</Empty>}
    </div>
  );
}

function Uploader() {
  const { run } = useAction();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) return setError("Please keep the video under 500 MB.");
    setError(null);
    const start = await startHeroUpload(titleRef.current?.value ?? "");
    if (!start.ok) return setError(start.error);
    setProgress(0);
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", start.url);
      xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => resolve();
      xhr.onerror = () => {
        setError("Upload failed — check your connection and try again.");
        resolve();
      };
      xhr.send(file);
    });
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
    run(async () => ({ ok: true, message: "Uploaded. Mux is preparing it — usually under a minute." }));
  };

  return (
    <Card className="flex flex-col gap-4 md:flex-row md:items-end">
      <div className="flex-1"><label className={label}>Title</label><input ref={titleRef} placeholder="e.g. Amber pour — October" className={input} /></div>
      <div className="flex-1"><label className={label}>Video file</label><input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" className={`${input} file:mr-3 file:rounded-full file:border-0 file:bg-dark file:px-3 file:py-1 file:text-xs file:text-paper`} /></div>
      <button type="button" onClick={upload} disabled={progress !== null} className="btn btn-dark disabled:opacity-60">
        {progress === null ? "Upload" : `Uploading ${progress}%`}
      </button>
      {error && <p className="text-sm text-[#7a2e12]">{error}</p>}
    </Card>
  );
}

function HeroCard({ v }: { v: V }) {
  const { run, pending } = useAction();
  const [tint, setTint] = useState(Number(v.tint));
  const [fx, setFx] = useState(Number(v.focal_x));
  const [fy, setFy] = useState(Number(v.focal_y));
  const [status, setStatus] = useState(v.status);
  const [playback, setPlayback] = useState(v.playback_id);

  // poll Mux while processing
  useEffect(() => {
    if (status === "ready" || status === "errored") return;
    const id = window.setInterval(async () => {
      const r = await fetch(`/api/admin/hero/${v.id}/sync`, { method: "POST" }).then((x) => x.json()).catch(() => null);
      if (r?.status === "ready") {
        setStatus("ready");
        setPlayback(r.playbackId ?? null);
      } else if (r?.status === "errored") setStatus("errored");
    }, 5000);
    return () => window.clearInterval(id);
  }, [status, v.id]);

  return (
    <Card className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-darker">
        {playback && status === "ready" ? (
          <>
            <HeroVideo media={{ playbackId: playback, mobilePlaybackId: null, posterUrl: null, tint, focalX: fx, focalY: fy }} className="absolute inset-0" />
            <div className="absolute inset-0 bg-darker" style={{ opacity: tint }} />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-cream" />
            <p className="absolute top-1/3 left-6 max-w-[60%] font-serif text-3xl leading-none text-paper">Healthy hair starts from the <em>root.</em></p>
            <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-amber" style={{ left: `${fx * 100}%`, top: `${fy * 100}%` }} title="Focal point" />
          </>
        ) : (
          <div className="grid h-full place-items-center text-sm text-paper/70">{status === "errored" ? "Mux couldn’t process this file." : "Processing…"}</div>
        )}
      </div>

      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          run(() =>
            updateHero(v.id, {
              title: String(fd.get("title")),
              tint,
              focalX: fx,
              focalY: fy,
              startsAt: fromLocal(String(fd.get("starts"))),
              endsAt: fromLocal(String(fd.get("ends"))),
              priority: Number(fd.get("priority") ?? 0),
              mobilePlaybackId: String(fd.get("mobile") ?? "") || null,
            }),
          );
        }}
      >
        <div className="col-span-2 flex items-center justify-between">
          <input name="title" defaultValue={v.title} className="bg-transparent font-serif text-2xl outline-none" aria-label="Title" />
          {v.is_active ? <span className="rounded-full bg-[#e6efdc] px-3 py-1 text-xs text-[#46613a]">Live</span> : <span className="rounded-full bg-cream-deep px-3 py-1 text-xs text-muted">Off</span>}
        </div>
        <label className="col-span-2 text-xs text-muted">Text-legibility tint · {Math.round(tint * 100)}%
          <input type="range" min={0} max={0.9} step={0.01} value={tint} onChange={(e) => setTint(Number(e.target.value))} className="mt-1 w-full accent-amber" />
        </label>
        <label className="text-xs text-muted">Focal point ↔ · {Math.round(fx * 100)}%
          <input type="range" min={0} max={1} step={0.01} value={fx} onChange={(e) => setFx(Number(e.target.value))} className="mt-1 w-full accent-amber" />
        </label>
        <label className="text-xs text-muted">Focal point ↕ · {Math.round(fy * 100)}%
          <input type="range" min={0} max={1} step={0.01} value={fy} onChange={(e) => setFy(Number(e.target.value))} className="mt-1 w-full accent-amber" />
        </label>
        <div><label className={label}>Show from</label><input name="starts" type="datetime-local" defaultValue={toLocal(v.starts_at)} className={input} /></div>
        <div><label className={label}>Until</label><input name="ends" type="datetime-local" defaultValue={toLocal(v.ends_at)} className={input} /></div>
        <div><label className={label}>Priority</label><input name="priority" type="number" min={0} max={100} defaultValue={v.priority} className={input} /></div>
        <div><label className={label}>Phone cut (playback ID)</label><input name="mobile" defaultValue={v.mobile_playback_id ?? ""} placeholder="optional" className={input} /></div>
        <div className="col-span-2 mt-2 flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className="btn btn-ghost disabled:opacity-50">Save</button>
          <button type="button" disabled={pending || status !== "ready"} onClick={() => run(() => setHeroLive(v.id, !v.is_active))} className="btn btn-dark disabled:opacity-50">
            {v.is_active ? "Take off homepage" : "Make live"}
          </button>
        </div>
      </form>
    </Card>
  );
}
