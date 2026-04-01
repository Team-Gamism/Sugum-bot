# CLAUDE.md

## 프로젝트 개요

**수금봇(Sugum-bot)**은 Discord 서버에서 욕설을 자동 감지하고 벌금을 부과하는 한국어 Discord 봇입니다.

- **언어:** JavaScript (Node.js 22.5+, CommonJS)
- **프레임워크:** discord.js v14
- **DB:** SQLite (Node.js 내장 `node:sqlite` API, 외부 패키지 불필요)

---

## 실행 방법

```bash
# 의존성 설치
npm install

# 슬래시 커맨드 Discord에 등록 (처음 또는 커맨드 변경 시)
npm run deploy

# 봇 실행
npm start
```

---

## 환경 변수 (.env)

| 변수 | 필수 | 설명 |
|------|------|------|
| `DISCORD_TOKEN` | 필수 | Discord 봇 토큰 |
| `CLIENT_ID` | 필수 | Discord 애플리케이션 ID |
| `GUILD_ID` | 선택 | 개발용 서버 ID (등록 즉시 반영) |
| `ADMIN_ROLE_NAME` | 선택 | 관리자 역할 이름 (기본값: `관리자`) |
| `DB_PATH` | 선택 | DB 파일 경로 (기본값: `./fines.db`) |

---

## 파일 구조

```
index.js              # 봇 진입점: 이벤트 리스너, 커맨드 디스패치, 욕설 감지
database.js           # SQLite 전체 DB 작업 함수 export
deploy-commands.js    # 슬래시 커맨드 Discord 등록 스크립트
profanityList.js      # 욕설 감지 엔진 (단순 부분 문자열 매칭)
commands/             # 슬래시 커맨드 모듈 (각 파일 = 커맨드 1개)
```

---

## 커맨드 목록

| 커맨드 | 권한 | 설명 |
|--------|------|------|
| `/순위` | 공개 | 미납 벌금 TOP 10 리더보드 |
| `신고` (컨텍스트 메뉴) | 공개 | 메시지 우클릭 → 신고 (관리자 검토 대기) |
| `/도움말` | 공개 | 커맨드 목록 표시 |
| `/목록` | 관리자 | 미납 벌금 요약 |
| `/내역 @user` | 관리자 | 특정 유저 벌금 상세 내역 |
| `/납부 @user` | 관리자 | 유저 벌금 납부 처리 |
| `/검토` | 관리자 | 신고 대기 메시지 승인/거절 |
| `/신고취소 [ID]` | 관리자 | 벌금 레코드 취소 |
| `/벌금설정 [금액]` | 관리자 | 벌금 금액 변경 (100~1,000,000원) |
| `/통계` | 관리자 | 전체 통계 및 TOP 10 욕설 |

---

## DB 스키마

```sql
-- 벌금 기록
CREATE TABLE fines (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         TEXT NOT NULL,
  username        TEXT NOT NULL,
  word_used       TEXT NOT NULL,       -- 감지된 욕설 또는 "[신고 접수]"
  message_content TEXT,
  amount          INTEGER NOT NULL DEFAULT 5000,
  paid            INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'auto',  -- 'auto' | 'pending' | 'approved' | 'rejected'
  reporter_id     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 설정 (벌금 금액 등)
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**status 값:**
- `auto`: 자동 감지된 벌금 (유효)
- `pending`: 신고 대기 중
- `approved`: 관리자 승인 (유효)
- `rejected`: 관리자 거절 (무효)

유효한 벌금 = `auto` 또는 `approved`

---

## 커맨드 추가 방법

`commands/` 디렉터리에 새 `.js` 파일 생성 후 아래 구조를 따릅니다:

```javascript
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { /* DB 함수 */ } = require("../database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("커맨드명")
    .setDescription("설명")
    .setDefaultMemberPermissions(0),  // 관리자 전용 시 추가

  adminOnly: true,  // 관리자 전용 여부

  async execute(interaction) {
    await interaction.reply({ content: "...", flags: MessageFlags.Ephemeral });
  }
};
```

이후 `npm run deploy` 실행으로 Discord에 등록.

---

## 권한 처리

관리자 체크는 `index.js`에서 중앙 처리됩니다 (개별 커맨드에서 재확인 불필요):
- `ADMIN_ROLE_NAME` 환경 변수 역할 이름 확인
- 또는 Discord 내장 Administrator 권한 확인
- 미인가 시 ephemeral 에러 메시지 반환

---

## 주요 패턴

- 모든 관리자 응답은 `MessageFlags.Ephemeral` (본인에게만 보임)
- 모든 응답은 `EmbedBuilder` 사용 (일반 텍스트 지양)
- 욕설 감지: 소문자 변환 + 공백 제거 후 부분 문자열 매칭
- 타임스탬프는 UTC가 아닌 로컬 시간(`localtime`) 사용
- DB 스키마 변경 시 `database.js`에서 `ALTER TABLE`로 마이그레이션 처리

---

## 배포 (Railway)

1. GitHub 푸시
2. Railway에서 GitHub 리포 연결
3. `/app/data` 볼륨 마운트
4. 환경 변수 설정 (`DB_PATH=/app/data/fines.db`)
5. `node deploy-commands.js` 한 번 실행 후 `node index.js`로 전환

자세한 내용은 `DEPLOY.md` 참조.
