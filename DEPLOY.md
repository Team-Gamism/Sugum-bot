# Railway 배포 가이드

## 사전 준비

- [Railway](https://railway.app) 계정 생성
- 프로젝트 코드가 GitHub 레포지토리에 push된 상태

---

## 1단계: 보안 조치 확인

`.gitignore`에 `.env`와 `fines.db`가 포함되어 있는지 확인하세요.

```
node_modules/
.env
fines.db
```

> **주의:** 만약 과거에 `.env`를 실수로 커밋했다면, Discord 봇 토큰을 즉시 재발급받아야 합니다.
> Discord Developer Portal → 애플리케이션 선택 → Bot → Token → Reset Token

---

## 2단계: Railway 프로젝트 생성

1. [railway.app](https://railway.app) 로그인
2. **New Project** 클릭
3. **Deploy from GitHub repo** 선택
4. 이 레포지토리(`Sugum-bot`) 선택
5. Railway가 자동으로 `Dockerfile`을 감지하여 빌드합니다

---

## 3단계: Volume 마운트 (DB 영속성)

SQLite 데이터베이스 파일은 컨테이너가 재시작되면 초기화됩니다.
데이터를 유지하려면 Railway Volume을 마운트해야 합니다.

1. Railway 대시보드에서 서비스 선택
2. 상단 탭 **Volumes** 클릭
3. **Add Volume** 클릭
4. Mount Path: `/app/data` 입력 후 저장

---

## 4단계: 환경변수 설정

Railway 대시보드 → 서비스 선택 → **Variables** 탭에서 아래 변수를 추가하세요.

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DISCORD_TOKEN` | 봇 토큰 (Discord Developer Portal) | `MTQ4...` |
| `CLIENT_ID` | 봇 애플리케이션 ID | `148885...` |
| `GUILD_ID` | 개발/테스트용 서버 ID (선택) | `121920...` |
| `ADMIN_ROLE_NAME` | 관리자 역할 이름 | `관리자` |
| `FINE_AMOUNT` | 기본 벌금 금액 (원) | `5000` |
| `DB_PATH` | SQLite DB 파일 경로 | `/app/data/fines.db` |

> `DB_PATH`는 반드시 3단계에서 마운트한 Volume 경로 안에 지정해야 합니다.
> 예: Volume을 `/app/data`에 마운트했다면 → `DB_PATH=/app/data/fines.db`

---

## 5단계: 슬래시 커맨드 등록

봇을 처음 배포하거나 커맨드를 변경한 경우, 슬래시 커맨드를 Discord에 등록해야 합니다.

Railway 대시보드 → 서비스 선택 → **Settings** → **Deploy** → **Start Command**를 일시적으로 변경:

```
node deploy-commands.js
```

배포 후 로그에서 커맨드 등록 완료 메시지를 확인한 뒤, Start Command를 원래대로 복원하세요:

```
node index.js
```

> **또는** 로컬에서 환경변수를 설정한 뒤 직접 실행할 수도 있습니다:
> ```bash
> node deploy-commands.js
> ```

---

## 6단계: 배포 확인

1. Railway 대시보드에서 **Deployments** 탭 클릭
2. 최신 배포 선택 → **View Logs** 로 실시간 로그 확인
3. 아래 메시지가 출력되면 정상입니다:
   ```
   ✅ 봇이 준비되었습니다! <봇이름>#0000
   ```
4. Discord 서버에서 `/순위` 커맨드로 동작 테스트

---

## 트러블슈팅

**봇이 오프라인 상태인 경우**
- `DISCORD_TOKEN`이 올바른지 확인
- Railway Logs에서 에러 메시지 확인

**커맨드가 표시되지 않는 경우**
- 5단계 슬래시 커맨드 등록 과정을 다시 실행
- 등록 후 Discord 클라이언트를 새로고침 (Ctrl+R)

**데이터가 재시작 후 초기화되는 경우**
- 3단계 Volume 마운트 확인
- `DB_PATH` 환경변수가 Volume 경로와 일치하는지 확인

**Node 버전 오류**
- 이 프로젝트는 Node.js 22 이상이 필요합니다 (내장 SQLite API 사용)
- `Dockerfile`에 `FROM node:22-alpine`이 명시되어 있으므로 Railway에서는 자동으로 처리됩니다
