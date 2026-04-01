/**
 * 욕설 감지 목록
 * - 단어를 추가/제거하여 커스터마이징 가능
 * - 정규식 패턴 또는 일반 문자열 모두 지원
 */
const PROFANITY_LIST = [
  // ㅅㅂ 계열
  "씨발", "시발", "씨바", "시바", "씨방", "씨팔", "시팔", "ㅅㅂ", "ㅆㅂ",
  // ㄱㅅ 계열
  "개새끼", "개새", "개새ㄲ", "ㄱㅅㄲ",
  // ㅂㅅ 계열
  "병신", "븅신", "빙신", "ㅂㅅ",
  // ㅈㄹ 계열
  "지랄", "ㅈㄹ",
  // ㅁㅊ 계열
  "미친놈", "미친년", "미친새끼", "ㅁㅊ",
  // 새끼 계열
  "새끼", "새기", "색끼", "ㅅㄲ",
  // 존나 계열
  "존나", "졌나", "조나", "ㅈㄴ",
  // 닥쳐 / 꺼져
  "닥쳐", "꺼져",
  // 창녀 계열
  "창녀", "창년",
  // 보지 계열
  "보지", "보짓",
  // 자지 계열
  "자지", "자짓",
  // 개같은
  "개같은", "개같이",
  // 거지같은
  "거지같은", "거지같이",
  // 뒤지다 (맥락에 따라 욕설로 사용)
  "뒤져", "뒤지게", "뒤질",
  // 엿
  "엿먹어", "엿이나",
];

/**
 * 메시지에서 욕설을 탐지합니다.
 * @param {string} message - 검사할 메시지
 * @returns {{ detected: boolean, words: string[] }} 탐지 결과
 */
function detectProfanity(message) {
  const normalized = message
    .replace(/\s+/g, "") // 공백 제거 (띄어쓰기 우회 방지)
    .toLowerCase();

  const detected = [];

  for (const word of PROFANITY_LIST) {
    if (normalized.includes(word.toLowerCase())) {
      detected.push(word);
    }
  }

  return {
    detected: detected.length > 0,
    words: [...new Set(detected)], // 중복 제거
  };
}

module.exports = { detectProfanity, PROFANITY_LIST };
