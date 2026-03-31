# AGENTS.md

이 저장소에서 작업하는 사람과 AI 기여자를 위한 안내입니다.

## 1. 목적

Paperclip은 AI 에이전트 회사들을 위한 컨트롤 플레인입니다.
현재 구현 목표는 V1이며, 구체적인 기준은 `doc/SPEC-implementation.md`에 정의되어 있습니다.

## 2. 먼저 읽을 것

변경을 시작하기 전에 아래 순서대로 읽으세요.

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

`doc/SPEC.md`는 장기적인 제품 맥락을 담고 있습니다.
`doc/SPEC-implementation.md`는 실제 V1 구현 계약입니다.

## 3. 저장소 구조

- `server/`: Express REST API와 오케스트레이션 서비스
- `ui/`: React + Vite 기반 보드 UI
- `packages/db/`: Drizzle 스키마, 마이그레이션, DB 클라이언트
- `packages/shared/`: 공유 타입, 상수, validator, API 경로 상수
- `packages/adapters/`: Claude, Codex, Cursor 등 에이전트 어댑터 구현
- `packages/adapter-utils/`: 공용 어댑터 유틸리티
- `packages/plugins/`: 플러그인 시스템 패키지
- `doc/`: 운영 및 제품 문서

## 4. 개발 환경 설정 (자동 DB)

개발 환경에서는 `DATABASE_URL`을 비워 두면 내장 PGlite를 사용합니다.

```sh
pnpm install
pnpm dev
```

이 명령은 다음을 시작합니다.

- API: `http://localhost:3100`
- UI: `http://localhost:3100` (개발 모드에서는 API 서버가 함께 서빙)

빠른 확인:

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

로컬 개발 DB 초기화:

```sh
rm -rf data/pglite
pnpm dev
```

## 5. 핵심 엔지니어링 규칙

1. 변경은 회사 범위를 유지하세요.
모든 도메인 엔터티는 회사 단위로 스코프되어야 하며, 라우트와 서비스에서 회사 경계를 강제해야 합니다.

2. 계약을 항상 동기화하세요.
스키마나 API 동작을 바꾸면 영향을 받는 모든 레이어를 함께 업데이트해야 합니다.
- `packages/db` 스키마와 export
- `packages/shared` 타입/상수/validator
- `server` 라우트/서비스
- `ui` API 클라이언트와 페이지

3. 컨트롤 플레인 불변식을 지키세요.
- 단일 담당자 작업 모델
- 원자적 이슈 checkout 의미론
- 거버넌스가 필요한 작업의 승인 게이트
- 예산 하드스톱 시 자동 일시중지
- 변경 작업에 대한 활동 로그 기록

4. 전략 문서를 통째로 갈아엎지 마세요. 요청받은 경우가 아니라면 추가적 업데이트를 우선하세요.
`doc/SPEC.md`와 `doc/SPEC-implementation.md`는 서로 정렬된 상태를 유지해야 합니다.

5. 계획 문서는 날짜 기반으로 중앙 관리하세요.
새 계획 문서는 `doc/plans/` 아래에 두고 파일명은 `YYYY-MM-DD-slug.md` 형식을 사용하세요.

## 6. 데이터베이스 변경 워크플로

데이터 모델을 바꿀 때는 다음 순서를 따르세요.

1. `packages/db/src/schema/*.ts` 수정
2. 새 테이블이 `packages/db/src/schema/index.ts`에서 export되는지 확인
3. 마이그레이션 생성:

```sh
pnpm db:generate
```

4. 컴파일 검증:

```sh
pnpm -r typecheck
```

참고:

- `packages/db/drizzle.config.ts`는 컴파일된 `dist/schema/*.js`를 읽습니다.
- `pnpm db:generate`는 먼저 `packages/db`를 컴파일합니다.

## 7. 인계 전 검증

완료라고 말하기 전에 아래 전체 검사를 실행하세요.

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

실행하지 못한 항목이 있다면 무엇을 왜 실행하지 못했는지 명시적으로 보고해야 합니다.

## 8. API 및 인증 기대사항

- 기본 경로: `/api`
- 보드 접근은 전체 제어 권한을 가진 운영자 문맥으로 취급합니다.
- 에이전트 접근은 bearer API key(`agent_api_keys`)를 사용하며, 키는 저장 시 해시 처리됩니다.
- 에이전트 키는 다른 회사 데이터에 접근하면 안 됩니다.

새 엔드포인트를 추가할 때는:

- 회사 접근 검사를 적용하고
- 액터 권한(보드 vs 에이전트)을 강제하고
- 변경 작업에 대해 activity log를 남기고
- 일관된 HTTP 오류(`400/401/403/404/409/422/500`)를 반환하세요.

## 9. UI 기대사항

- 라우트와 내비게이션은 실제 API 표면과 맞아야 합니다.
- 회사 단위 페이지는 company selection context를 사용하세요.
- API 오류를 조용히 무시하지 말고 분명하게 드러내세요.

## 10. 완료 정의

다음이 모두 참일 때 변경은 완료입니다.

1. 동작이 `doc/SPEC-implementation.md`와 일치한다.
2. 타입체크, 테스트, 빌드가 통과한다.
3. db/shared/server/ui 간 계약이 동기화되어 있다.
4. 동작이나 명령이 바뀌었다면 문서도 업데이트되어 있다.
