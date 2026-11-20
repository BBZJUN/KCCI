// 사용자가 직접 연 공고 페이지의 텍스트만 읽는다 (무단 크롤링 없음).
// 분석 결과는 바로 저장하지 않고, 웹 캘린더(화면 ②)로 넘겨 사용자가 확인·추가한다 (AI는 제안, 사용자가 확정).
const DEFAULT_API = "http://localhost:3000";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let last = null; // { text, extraction, sourceUrl, hash }

async function apiBase() {
  const { apiBase } = await chrome.storage.sync.get("apiBase");
  return (apiBase || DEFAULT_API).replace(/\/$/, "");
}

/** 기본 허용 목록(localhost, *.vercel.app) 밖의 주소는 처음 한 번 권한을 묻는다 */
async function ensurePermission(base) {
  const origin = new URL(base).origin + "/*";
  if (await chrome.permissions.contains({ origins: [origin] })) return true;
  return chrome.permissions.request({ origins: [origin] });
}

// UTF-8 → base64url (웹의 /import 페이지가 같은 방식으로 되돌린다)
function encodePayload(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

$("toggle").addEventListener("click", async () => {
  const box = $("settings");
  box.style.display = box.style.display === "block" ? "none" : "block";
  $("api").value = await apiBase();
});

$("saveApi").addEventListener("click", async () => {
  const value = $("api").value.trim() || DEFAULT_API;
  try {
    new URL(value);
  } catch {
    $("out").innerHTML = `<p class="err">주소 형식이 올바르지 않아요</p>`;
    return;
  }
  if (!(await ensurePermission(value))) {
    $("out").innerHTML = `<p class="err">이 주소에 접근 권한이 없어 저장하지 않았어요</p>`;
    return;
  }
  await chrome.storage.sync.set({ apiBase: value });
  $("settings").style.display = "none";
});

$("grab").addEventListener("click", async () => {
  const btn = $("grab");
  btn.disabled = true;
  btn.textContent = "공고 읽는 중…";
  $("out").innerHTML = "";
  last = null;
  try {
    const base = await apiBase();
    if (!(await ensurePermission(base))) throw new Error("잡도리 웹 주소에 접근 권한이 필요해요 (설정)");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result: text }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      // 선택한 영역이 있으면 그 부분만, 없으면 본문 전체
      func: () => (window.getSelection()?.toString().trim() || document.body.innerText).slice(0, 20000),
    });
    const res = await fetch(`${base}/api/postings/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, sourceUrl: tab.url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    const { extraction, plan, cached } = data;
    last = { text, extraction, sourceUrl: tab.url, hash: data.hash };
    $("out").innerHTML =
      `<ul><li><b>${esc(extraction.company)}</b>${cached ? " <small>· 공유 캐시</small>" : ""}<br><small>${esc(extraction.title)}</small></li>` +
      plan.map((s) => `<li class="${s.confidence}"><b>${esc(s.stage_name)}</b> ${esc(s.start ?? "날짜 미정")}${s.end && s.end !== s.start ? " ~ " + esc(s.end) : ""}<br><small>근거 “${esc(s.evidence)}”</small></li>`).join("") +
      `</ul><button id="open" class="secondary">웹 캘린더에서 확인하고 담기</button>`;
    $("open").addEventListener("click", openInCalendar);
  } catch (e) {
    $("out").innerHTML = `<p class="err">${esc(e.message)}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "이 공고의 전형 일정 가져오기";
  }
});

// 해시(#)로 넘기므로 공고 원문이 서버 로그에 남지 않는다
async function openInCalendar() {
  if (!last) return;
  const base = await apiBase();
  await chrome.tabs.create({ url: `${base}/import#${encodePayload(last)}` });
  window.close();
}
