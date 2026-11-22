import { createHash } from "node:crypto";
import { z } from "zod";
import { structured, WEB_BUDGET } from "./llm";
import { maskPII } from "./pii";

const CaptureText = z.object({
  text: z.string().describe("이미지 속 글자를 줄바꿈까지 그대로 옮긴 것. 사람 이름은 [이름], 전화번호·이메일은 [연락처]로 바꾼다"),
  is_notice: z.boolean().describe("채용 결과·일정 안내로 보이면 true"),
});

const SYSTEM = `너는 채용 안내 캡처(문자·메일·앱 알림 화면)의 글자를 옮겨 적는 도구다.
- 이미지에 보이는 안내 문장을 줄바꿈까지 그대로 옮긴다. 화면 장식(시계, 배터리, 버튼)은 뺀다.
- 사람 이름은 [이름], 전화번호·이메일 주소는 [연락처]로 바꿔 적는다.
- 이미지에 없는 내용은 지어내지 않는다. 읽을 수 없는 부분은 [판독 불가]로 둔다.`;

/** 시연용 캡처(public/samples/notice-sms.png) — AI를 못 쓸 때 미리 옮겨 둔 글을 쓴다 */
const KNOWN: Record<string, string> = {
  "9f6c025d03a0c5db75f8d7cd6f37723f3e5ed22fca08582f435fd16749ed54a0": `[Web발신]
[SK하이닉스] 면접 일정 안내
[이름]님, SKCT 합격을 축하드립니다.
면접은 12월 22일(화) 오전 10시 이천캠퍼스 인재개발원에서 진행됩니다.
신분증을 지참해 주시고, 문의는 [연락처]로 연락 주세요.`,
};

export const knownCapture = (dataUrl: string) => KNOWN[createHash("sha256").update(dataUrl).digest("hex")] ?? null;

/**
 * 도구 transcribe_capture: 캡처 이미지 → 안내 글. 이미지는 저장하지 않고, 옮긴 글에도 maskPII를 한 번 더 적용한다.
 * (이미지 자체는 가릴 수 없으므로 화면에서 '이름·연락처가 보이면 가리고 올려 달라'고 안내)
 */
export async function transcribeCapture(dataUrl: string): Promise<{ text: string; is_notice: boolean }> {
  const out = await structured({
    kind: "extract",
    system: SYSTEM,
    user: "이 캡처의 안내 글을 옮겨 적어 줘.",
    images: [dataUrl],
    schema: CaptureText,
    name: "capture_text",
    budget: WEB_BUDGET,
  });
  return { text: maskPII(out.text), is_notice: out.is_notice };
}
