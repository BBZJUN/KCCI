import { z } from "zod";
import { PostingExtraction } from "./schemas";

/** 크롬 확장 → /import#<base64url(JSON)> 으로 넘어오는 값. 해시는 서버로 전송되지 않는다. */
export const ImportPayload = z.object({
  text: z.string().min(1).max(40000),
  extraction: PostingExtraction,
  sourceUrl: z.string().nullable().optional(),
  hash: z.string().nullable().optional(),
});
export type ImportPayload = z.infer<typeof ImportPayload>;

export function encodeImport(p: ImportPayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(p));
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeImport(fragment: string): ImportPayload | null {
  try {
    const b64 = fragment.replace(/^#/, "").replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    const parsed = ImportPayload.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
