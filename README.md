# 💰 수금봇 — 욕설 벌금 디스코드 봇

동아리 채널에서 욕설을 사용할 때마다 자동으로 벌금을 부과하고 기록하는 디스코드 봇입니다.

## 기능

- 욕설 감지 시 채널에 경고 메시지 전송
- 유저별 벌금 자동 기록 (SQLite)
- 관리자 슬래시 커맨드로 데이터 관리

## 슬래시 커맨드

| 커맨드 | 설명 | 권한 |
|--------|------|------|
| `/순위` | 미납 벌금 리더보드 | 전체 |
| `/목록` | 미납 벌금 전체 목록 | 관리자 |
| `/내역 @유저` | 특정 유저 벌금 상세 내역 | 관리자 |
| `/납부 @유저` | 유저 벌금 납부 처리 | 관리자 |
| `/통계` | 전체 통계 및 욕설 랭킹 | 관리자 |

## 설치 및 실행

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env
```
`.env` 파일을 열어 아래 값을 입력합니다:
- `DISCORD_TOKEN` — Discord Developer Portal에서 발급한 봇 토큰
- `CLIENT_ID` — 봇의 애플리케이션 ID
- `GUILD_ID` — 개발/테스트할 서버 ID (슬래시 커맨드 즉시 반영용)
- `ADMIN_ROLE_NAME` — 관리자 역할 이름 (기본값: `관리자`)

### 3. 슬래시 커맨드 등록
```bash
npm run deploy
```

### 4. 봇 실행
```bash
npm start
```

## Discord Developer Portal 봇 설정

봇이 메시지를 읽으려면 **Privileged Gateway Intents**에서 `MESSAGE CONTENT INTENT`를 활성화해야 합니다.

## 욕설 목록 커스터마이징

[profanityList.js](profanityList.js)의 `PROFANITY_LIST` 배열에 단어를 추가하거나 제거하세요.
