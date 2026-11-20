import { createHash } from "node:crypto";
import type { PostingExtraction } from "../schemas";

/**
 * 공고 분석 공유 캐시 (docs/agent-spec.md '공유 캐시').
 * 같은 공고 원문은 1회만 LLM으로 분석한다. 비용은 사용자 수가 아니라 신규 공고 수에 비례.
 * - SUPABASE_SERVICE_ROLE_KEY가 있으면 posting_cache 테이블
 * - 없으면 서버 메모리 (개발·시연용, 재시작 시 초기화)
 */

/** 줄바꿈·공백·전각 공백 차이만 무시한다. 글자가 다르면 다른 공고로 본다. */
export function normalizePosting(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[ 　\t ]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

export function postingHash(text: string): string {
  return createHash("sha256").update(normalizePosting(text)).digest("hex");
}

export type CachedPosting = { extraction: PostingExtraction; model: string; createdAt: string };

export interface PostingCache {
  get(hash: string): Promise<CachedPosting | null>;
  set(hash: string, value: CachedPosting, sourceUrl?: string): Promise<void>;
}

export function memoryCache(): PostingCache {
  const map = new Map<string, CachedPosting>();
  return {
    async get(hash) {
      return map.get(hash) ?? null;
    },
    async set(hash, value) {
      map.set(hash, value);
    },
  };
}

function supabaseCache(url: string, serviceKey: string): PostingCache {
  const base = `${url.replace(/\/$/, "")}/rest/v1/posting_cache`;
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  return {
    async get(hash) {
      const res = await fetch(`${base}?content_hash=eq.${hash}&select=extraction,model,created_at`, { headers, cache: "no-store" });
      if (!res.ok) return null;
      const rows = (await res.json()) as { extraction: PostingExtraction; model: string; created_at: string }[];
      const row = rows[0];
      return row ? { extraction: row.extraction, model: row.model, createdAt: row.created_at } : null;
    },
    async set(hash, value, sourceUrl) {
      await fetch(base, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=ignore-duplicates" },
        body: JSON.stringify({
          content_hash: hash,
          source_url: sourceUrl ?? null,
          company: value.extraction.company,
          title: value.extraction.title,
          extraction: value.extraction,
          model: value.model,
        }),
      }).catch(() => undefined); // 캐시 저장 실패는 분석 결과에 영향 없음
    },
  };
}

const g = globalThis as unknown as { __postingCache?: PostingCache };

export function getPostingCache(): PostingCache {
  if (g.__postingCache) return g.__postingCache;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  g.__postingCache = url && key ? supabaseCache(url, key) : memoryCache();
  return g.__postingCache;
}
