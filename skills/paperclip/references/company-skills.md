# 회사 스킬 워크플로

보드 사용자, CEO, 또는 매니저가 스킬을 찾고 회사 라이브러리에 설치하거나 특정 에이전트에 할당해 달라고 요청할 때 이 문서를 참고하세요.

## 무엇이 존재하나

- 회사 스킬 라이브러리: 회사 전체에서 가져온 스킬을 설치, 조회, 업데이트, 읽을 수 있습니다.
- 에이전트 스킬 할당: 기존 에이전트에 회사 스킬을 추가하거나 제거할 수 있습니다.
- 채용/생성 조합: 에이전트를 생성하거나 채용할 때 `desiredSkills`를 전달하면 같은 할당 모델이 즉시 적용됩니다.

정석 흐름은 다음과 같습니다.

1. 스킬을 회사에 설치합니다.
2. 회사 스킬을 에이전트에 할당합니다.
3. 선택적으로 2단계를 채용/생성 시점에 `desiredSkills`로 함께 처리합니다.

## 권한 모델

- 회사 스킬 읽기: 같은 회사의 모든 액터
- 회사 스킬 변경: 보드, CEO, 또는 실효 권한 `agents:create`를 가진 에이전트
- 에이전트 스킬 할당: 해당 에이전트를 업데이트할 때와 동일한 권한 모델

## 핵심 엔드포인트

- `GET /api/companies/:companyId/skills`
- `GET /api/companies/:companyId/skills/:skillId`
- `POST /api/companies/:companyId/skills/import`
- `POST /api/companies/:companyId/skills/scan-projects`
- `POST /api/companies/:companyId/skills/:skillId/install-update`
- `GET /api/agents/:agentId/skills`
- `POST /api/agents/:agentId/skills/sync`
- `POST /api/companies/:companyId/agent-hires`
- `POST /api/companies/:companyId/agents`

## 회사에 스킬 설치하기

스킬은 **skills.sh URL**, key 스타일 source 문자열, GitHub URL, 또는 로컬 경로로 import할 수 있습니다.

### source 유형 (권장 순서)

| source 형식 | 예시 | 언제 쓰나 |
| --- | --- | --- |
| **skills.sh URL** | `https://skills.sh/google-labs-code/stitch-skills/design-md` | 사용자가 `skills.sh` 링크를 주었을 때 사용합니다. 관리형 스킬 레지스트리이므로 **가능하면 항상 이것을 우선**하세요. |
| **Key 스타일 문자열** | `google-labs-code/stitch-skills/design-md` | 같은 스킬을 `org/repo/skill-name` 형태로 줄여 쓴 표현입니다. skills.sh URL과 동등합니다. |
| **GitHub URL** | `https://github.com/vercel-labs/agent-browser` | 스킬이 GitHub 저장소에는 있지만 skills.sh에는 없을 때 사용합니다. |
| **로컬 경로** | `/abs/path/to/skill-dir` | 스킬이 디스크에 있을 때 사용합니다. 보통 개발/테스트용입니다. |

**중요:** 사용자가 `https://skills.sh/...` URL을 주면, 그 URL 자체나 key 스타일 등가 표현(`org/repo/skill-name`)을 `source`로 사용하세요. GitHub URL로 바꾸지 마세요. skills.sh가 버전, 발견성, 업데이트의 기준이 되는 관리형 레지스트리입니다.

### 예시: skills.sh import (권장)

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/import" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "https://skills.sh/google-labs-code/stitch-skills/design-md"
  }'
```

동일한 스킬을 key 스타일 문자열로도 표현할 수 있습니다.

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/import" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "google-labs-code/stitch-skills/design-md"
  }'
```

### 예시: GitHub import

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/import" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "https://github.com/vercel-labs/agent-browser"
  }'
```

다음과 같은 source 문자열도 사용할 수 있습니다.

- `google-labs-code/stitch-skills/design-md`
- `vercel-labs/agent-browser/agent-browser`
- `npx skills add https://github.com/vercel-labs/agent-browser --skill agent-browser`

먼저 회사 프로젝트 workspace에서 스킬을 탐색해야 하는 작업이라면 다음 경로를 사용합니다.

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/scan-projects" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 무엇이 설치되었는지 확인하기

```sh
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

설치된 스킬 엔트리와 해당 `SKILL.md`를 읽습니다.

```sh
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/<skill-id>" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"

curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/skills/<skill-id>/files?path=SKILL.md" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

## 기존 에이전트에 스킬 할당하기

`desiredSkills`는 다음 형태를 받을 수 있습니다.

- 정확한 회사 스킬 key
- 정확한 회사 스킬 id
- 회사 내에서 유일할 때는 정확한 slug

서버는 canonical company skill key를 저장합니다.

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/agents/<agent-id>/skills/sync" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "desiredSkills": [
      "vercel-labs/agent-browser/agent-browser"
    ]
  }'
```

현재 상태를 먼저 봐야 한다면:

```sh
curl -sS "$PAPERCLIP_API_URL/api/agents/<agent-id>/skills" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

## 채용 또는 생성 시 스킬 포함하기

에이전트를 채용하거나 생성할 때도 같은 회사 스킬 key 또는 참조를 `desiredSkills`에 넣을 수 있습니다.

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agent-hires" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "QA Browser Agent",
    "role": "qa",
    "adapterType": "codex_local",
    "adapterConfig": {
      "cwd": "/abs/path/to/repo"
    },
    "desiredSkills": [
      "agent-browser"
    ]
  }'
```

승인 없이 직접 생성하는 경우:

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agents" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "QA Browser Agent",
    "role": "qa",
    "adapterType": "codex_local",
    "adapterConfig": {
      "cwd": "/abs/path/to/repo"
    },
    "desiredSkills": [
      "agent-browser"
    ]
  }'
```

## 참고 사항

- 내장 Paperclip 런타임 스킬은 어댑터에 필요할 때 자동으로 추가됩니다.
- 참조가 없거나 모호하면 API는 `422`를 반환합니다.
- 스킬 변경에 대해 댓글을 남길 때는 관련 이슈, 승인, 에이전트로 돌아가는 링크를 함께 남기는 편이 좋습니다.
- 스킬 하나만이 아니라 전체 패키지 import/export가 필요하면 회사 portability 경로를 사용하세요.
- `POST /api/companies/:companyId/imports/preview`
- `POST /api/companies/:companyId/imports/apply`
- `POST /api/companies/:companyId/exports/preview`
- `POST /api/companies/:companyId/exports`
- 작업의 목적이 주변 회사/팀/패키지 구조를 가져오는 것이 아니라, 회사 라이브러리에 스킬 하나를 추가하는 것이라면 skill-only import를 사용하세요.
