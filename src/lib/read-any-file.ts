/* Turns whatever file someone picks into searchable text, in the browser:
   plain text / CSV in any common encoding (UTF-8, Excel's "Unicode text" UTF-16),
   and zipped office files (Excel .xlsx, Numbers-exported .xlsx, OpenDocument .ods)
   by unzipping their XML parts — no libraries, nothing uploaded. */

const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

async function inflate(data: Uint8Array) {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Text of every .xml part inside a zip (an .xlsx/.ods is a zip of XML files). */
async function zipXmlText(b: Uint8Array) {
  // the "end of central directory" record sits in the last 64KB
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65_557); i--) {
    if (u32(b, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return "";
  const count = u16(b, eocd + 10);
  let p = u32(b, eocd + 16);
  const parts: string[] = [];
  const utf8 = new TextDecoder();
  for (let n = 0; n < count && u32(b, p) === 0x02014b50; n++) {
    const method = u16(b, p + 10);
    const size = u32(b, p + 20);
    const nameLen = u16(b, p + 28);
    const extraLen = u16(b, p + 30);
    const commentLen = u16(b, p + 32);
    const local = u32(b, p + 42);
    const name = utf8.decode(b.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!/\.xml$/i.test(name) || /styles|theme|settings|manifest/i.test(name)) continue;
    const start = local + 30 + u16(b, local + 26) + u16(b, local + 28);
    const raw = b.subarray(start, start + size);
    try {
      parts.push(utf8.decode(method === 8 ? await inflate(raw) : raw));
    } catch {}
  }
  return parts.join("\n");
}

export async function readAnyFile(file: File) {
  const b = new Uint8Array(await file.arrayBuffer());
  if (b.length > 3 && u32(b, 0) === 0x04034b50) return zipXmlText(b); // PK.. → zip
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder("utf-16le").decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder("utf-16be").decode(b.subarray(2));
  // UTF-16 without a marker: every other byte is zero
  const sample = b.subarray(0, 400);
  const zeros = sample.filter((x, i) => i % 2 === 1 && x === 0).length;
  if (sample.length > 20 && zeros > sample.length / 4) return new TextDecoder("utf-16le").decode(b);
  return new TextDecoder().decode(b);
}
