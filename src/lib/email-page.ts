/** The small branded page behind links in emails. Messages are fixed text, never user input. */
export function emailPage(message: string, button?: { action: string; label: string }) {
  const form = button
    ? `<form method="post" action="${button.action.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"><button style="margin:16px 0;background:#3a2a22;color:#fffaf5;border:0;border-radius:999px;padding:14px 28px;font:14px Georgia,serif;cursor:pointer">${button.label}</button></form>`
    : "";
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>Nazia Botanics</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#faf3ec;font-family:Georgia,serif;color:#2b211c;text-align:center;padding:24px"><div><p style="letter-spacing:.34em">NAZIA</p><h1 style="font-weight:400">${message}</h1>${form}<p><a href="/" style="color:#9a4d16">Back to the shop</a></p></div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
