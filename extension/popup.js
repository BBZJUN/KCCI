// 사용자가 직접 연 공고 페이지의 텍스트만 읽는다 (무단 크롤링 없음).
const API = "http://localhost:3000"; // 배포 후 manifest host_permissions와 함께 교체

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

$("grab").addEventListener("click", async () => {
  const btn = $("grab");
  btn.disabled = true;
  btn.textContent = "공고 읽는 중…";
  $("out").innerHTML = "";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result: text }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      // 선택한 영역이 있으면 그 부분만, 없으면 본문 전체
      func: () => (window.getSelection()?.toString().trim() || document.body.innerText).slice(0, 20000),
    });
    const res = await fetch(`${API}/api/postings/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, sourceUrl: tab.url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    const { extraction, plan } = data;
    $("out").innerHTML =
      `<ul><li><b>${esc(extraction.company)}</b><br><small>${esc(extraction.title)}</small></li>` +
      plan.map((s) => `<li class="${s.confidence}"><b>${esc(s.stage_name)}</b> ${esc(s.start ?? "날짜 미정")}${s.end && s.end !== s.start ? " ~ " + esc(s.end) : ""}<br><small>근거 “${esc(s.evidence)}”</small></li>`).join("") +
      `</ul>`;
    // TODO(P0): 사용자가 확인 버튼을 누르면 /api/applications 로 저장 후 웹 캘린더 열기
  } catch (e) {
    $("out").innerHTML = `<p class="err">${esc(e.message)}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "이 공고의 전형 일정 가져오기";
  }
});
