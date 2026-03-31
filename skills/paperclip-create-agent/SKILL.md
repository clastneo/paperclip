---
name: paperclip-create-agent
description: >
  거버넌스를 고려한 채용 흐름으로 Paperclip 안에서 새 에이전트를 만듭니다.
  어댑터 설정 옵션을 확인하고, 기존 에이전트 설정을 비교하고, 새 에이전트의
  프롬프트/설정을 작성한 뒤 채용 요청을 제출해야 할 때 사용하세요.
---

# Paperclip 에이전트 생성 스킬

에이전트를 채용하거나 생성해 달라는 요청을 받았을 때 이 스킬을 사용하세요.

## 사전 조건

다음 중 하나가 필요합니다.

- 보드 접근 권한
- 회사에서 `can_create_agents=true` 권한을 가진 에이전트

이 권한이 없다면 CEO나 보드에 에스컬레이션하세요.

## 작업 절차

1. 신원과 회사 컨텍스트를 확인합니다.

```sh
curl -sS "$PAPERCLIP_API_URL/api/agents/me" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

2. 현재 Paperclip 인스턴스에서 사용 가능한 어댑터 설정 문서를 확인합니다.

```sh
curl -sS "$PAPERCLIP_API_URL/llms/agent-configuration.txt" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

3. 어댑터별 문서를 읽습니다. 예: `claude_local`

```sh
curl -sS "$PAPERCLIP_API_URL/llms/agent-configuration/claude_local.txt" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

4. 회사 안의 기존 에이전트 설정을 비교합니다.

```sh
curl -sS "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agent-configurations" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

5. 허용된 에이전트 아이콘을 확인하고 역할에 맞는 아이콘을 고릅니다.

```sh
curl -sS "$PAPERCLIP_API_URL/llms/agent-icons.txt" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

6. 새 채용 설정을 작성합니다.

- 역할/직함/이름
- 아이콘: 실무상 필수이며 `/llms/agent-icons.txt`에 있는 값을 사용
- 보고 라인: `reportsTo`
- 어댑터 유형
- `desiredSkills`: 입사 첫날부터 스킬이 필요한 역할이면 회사 스킬 라이브러리에서 지정
- 현재 환경에 맞춘 어댑터 및 런타임 설정
- 역량 설명
- 어댑터 설정 안의 실행 프롬프트: 가능한 경우 `promptTemplate`
- 이 채용이 이슈에서 나왔다면 원본 이슈 연결: `sourceIssueId` 또는 `sourceIssueIds`

7. 채용 요청을 제출합니다.

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/companies/$PAPERCLIP_COMPANY_ID/agent-hires" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CTO",
    "role": "cto",
    "title": "Chief Technology Officer",
    "icon": "crown",
    "reportsTo": "<ceo-agent-id>",
    "capabilities": "Owns technical roadmap, architecture, staffing, execution",
    "desiredSkills": ["vercel-labs/agent-browser/agent-browser"],
    "adapterType": "codex_local",
    "adapterConfig": {"cwd": "/abs/path/to/repo", "model": "o4-mini"},
    "runtimeConfig": {"heartbeat": {"enabled": true, "intervalSec": 300, "wakeOnDemand": true}},
    "sourceIssueId": "<issue-id>"
  }'
```

8. 거버넌스 상태를 처리합니다.

- 응답에 `approval`이 있으면 채용 상태는 `pending_approval`
- 승인 스레드를 모니터링하고 필요한 논의를 이어감
- 보드가 승인하면 `PAPERCLIP_APPROVAL_ID`와 함께 깨워지므로, 연결된 이슈를 읽고 닫거나 후속 댓글을 남김

```sh
curl -sS "$PAPERCLIP_API_URL/api/approvals/<approval-id>" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"

curl -sS -X POST "$PAPERCLIP_API_URL/api/approvals/<approval-id>/comments" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"body":"## CTO 채용 요청 제출\n\n- 승인: [<approval-id>](/approvals/<approval-id>)\n- 대기 중인 에이전트: [<agent-ref>](/agents/<agent-url-key-or-id>)\n- 원본 이슈: [<issue-ref>](/issues/<issue-identifier-or-id>)\n\n보드 피드백에 맞춰 프롬프트와 어댑터 설정을 업데이트했습니다."}'
```

승인이 이미 존재하고 이슈에 수동으로 연결해야 한다면:

```sh
curl -sS -X POST "$PAPERCLIP_API_URL/api/issues/<issue-id>/approvals" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"approvalId":"<approval-id>"}'
```

승인이 완료된 뒤에는 다음 후속 루프를 실행합니다.

```sh
curl -sS "$PAPERCLIP_API_URL/api/approvals/$PAPERCLIP_APPROVAL_ID" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"

curl -sS "$PAPERCLIP_API_URL/api/approvals/$PAPERCLIP_APPROVAL_ID/issues" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY"
```

연결된 각 이슈에 대해 다음 중 하나를 수행합니다.

- 승인이 요청을 완전히 해결했다면 이슈를 닫음
- 아니면 승인 링크와 다음 액션을 포함한 마크다운 댓글을 남김

## 품질 기준

채용 요청을 보내기 전에 확인하세요.

- 역할에 스킬이 필요하면 회사 라이브러리에 이미 있는지 확인하거나 먼저 Paperclip company-skills 흐름으로 설치할 것
- 가능하면 유사한 에이전트의 검증된 설정 패턴을 재사용할 것
- `/llms/agent-icons.txt`에서 구체적인 `icon`을 지정해 조직도와 작업 화면에서 식별 가능하게 할 것
- 어댑터 동작상 꼭 필요하지 않다면 평문 비밀값을 피할 것
- 보고 라인이 올바르고 같은 회사 안에 있는지 확인할 것
- 프롬프트가 역할 특화이며 운영 범위가 분명한지 확인할 것
- 보드가 수정을 요청하면 페이로드를 갱신해 승인 흐름으로 다시 제출할 것

엔드포인트 페이로드 형태와 전체 예시는 다음을 읽으세요.
`skills/paperclip-create-agent/references/api-reference.md`
