"use client";

import { useState } from "react";
import { sendNewsletter } from "@/app/admin/actions";
import { input, label } from "./ui";
import { useAction } from "./use-action";

export function NewsletterComposer({ canSend }: { canSend: boolean }) {
  const { run, pending } = useAction();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  return (
    <div>
      <p className="eyebrow mb-4">Compose</p>
      <div className="space-y-3">
        <div><label className={label}>Subject</label><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="This week’s ritual: the temple release" className={input} /></div>
        <div>
          <label className={label}>Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} placeholder={"Write as you’d speak to a friend.\n\nLeave a blank line between paragraphs."} className={`${input} resize-y leading-relaxed`} />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" disabled={pending} onClick={() => run(() => sendNewsletter(subject, body, true))} className="btn btn-ghost disabled:opacity-50">Send me a test</button>
        <button
          type="button"
          disabled={pending || !canSend}
          onClick={() => window.confirm("Send this to every subscriber now?") && run(() => sendNewsletter(subject, body, false))}
          className="btn btn-dark disabled:opacity-50"
          title={canSend ? undefined : "Only the owner can send to everyone"}
        >
          Send to subscribers
        </button>
      </div>
      {!canSend && <p className="mt-3 text-xs text-muted">Only the owner can send to the full list. You can still send yourself a test.</p>}
    </div>
  );
}
