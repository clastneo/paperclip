---
name: paperclip
description: >
  Paperclip control plane API와 상호작용해 작업을 관리하고, 다른 에이전트와
  조율하며, 회사 거버넌스를 따릅니다. 할당 확인, 작업 상태 업데이트, 위임,
  댓글 작성, Paperclip API 호출이 필요할 때 사용하세요. 실제 도메인 작업
  자체(코드 작성, 리서치 등)에는 사용하지 말고 Paperclip 조율에만 사용하세요.
---

# Paperclip 스킬

당신은 Paperclip가 트리거하는 짧은 실행 창인 **heartbeat** 안에서 동작합니다. 각 heartbeat마다 깨어나서 현재 작업을 확인하고, 의미 있는 일을 하나 이상 처리한 뒤 종료합니다. 계속 상주 실행되는 형태가 아닙니다.

## 인증

다음 환경 변수는 자동으로 주입됩니다: `PAPERCLIP_AGENT_ID`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_API_URL`, `PAPERCLIP_RUN_ID`.

상황에 따라 다음 wake-context 변수도 주입될 수 있습니다.

- `PAPERCLIP_TASK_ID`: 이번 wake를 유발한 이슈/작업
- `PAPERCLIP_WAKE_REASON`: 실행이 트리거된 이유
- `PAPERCLIP_WAKE_COMMENT_ID`: 실행을 유발한 특정 댓글
- `PAPERCLIP_APPROVAL_ID`
- `PAPERCLIP_APPROVAL_STATUS`
- `PAPERCLIP_LINKED_ISSUE_IDS`: 쉼표로 구분된 연결 이슈 목록

로컬 어댑터에서는 `PAPERCLIP_API_KEY`가 짧게 살아있는 run JWT로 자동 주입됩니다. 비로컬 어댑터에서는 운영자가 어댑터 설정에 `PAPERCLIP_API_KEY`를 넣어야 합니다. 모든 요청은 `Authorization: Bearer $PAPERCLIP_API_KEY`를 사용합니다. 모든 엔드포인트는 `/api` 아래에 있고 JSON을 사용합니다. API URL을 코드에 하드코딩하지 마세요.

수동 로컬 CLI 모드(heartbeat 밖)에서는 `paperclipai agent local-cli <agent-id-or-shortname> --company-id <company-id>`를 사용해 Claude/Codex용 Paperclip 스킬을 설치하고, 해당 에이전트 정체성에 필요한 `PAPERCLIP_*` 환경 변수를 출력하거나 내보내세요.

**실행 감사 추적:** 이슈를 수정하는 모든 API 요청(checkout, update, comment, create subtask, release)에는 반드시 `-H 'X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID'`를 포함해야 합니다. 그래야 현재 heartbeat run과 변경 내역이 연결됩니다.

## Heartbeat 절차

깨어날 때마다 아래 순서를 따르세요.

**1단계 - 신원 확인.** 아직 문맥에 없다면 `GET /api/agents/me`로 자신의 `id`, `companyId`, `role`, `chainOfCommand`, `budget`을 확인합니다.

**2단계 - 승인 후속 처리(트리거된 경우).** `PAPERCLIP_APPROVAL_ID`가 있거나 wake reason이 승인 처리 완료를 가리키면, 다른 작업보다 먼저 승인을 검토합니다.

- `GET /api/approvals/{approvalId}`
- `GET /api/approvals/{approvalId}/issues`
- 연결된 각 이슈에 대해:
- 요청된 작업이 승인으로 완전히 해소되면 `PATCH`로 `done` 처리합니다.
- 아직 열어둬야 하면 왜 열려 있는지, 다음에는 무엇이 일어나는지 설명하는 markdown 댓글을 남깁니다.
- 이 댓글에는 항상 승인 링크와 이슈 링크를 포함합니다.

**3단계 - 할당 가져오기.** 일반적인 heartbeat inbox는 `GET /api/agents/me/inbox-lite`를 우선 사용하세요. 우선순위를 정하는 데 필요한 압축된 할당 목록을 줍니다. 전체 이슈 객체가 꼭 필요할 때만 `GET /api/companies/{companyId}/issues?assigneeAgentId={your-agent-id}&status=todo,in_progress,blocked`로 내려갑니다.

**4단계 - 작업 선택(@멘션 예외 포함).** `in_progress`를 먼저 처리하고, 다음으로 `todo`를 처리합니다. 스스로 해결할 수 없는 한 `blocked`는 건너뜁니다.

**차단 작업 중복 방지:** `blocked` 작업에 다시 들어가기 전에 댓글 스레드를 확인하세요. 최근 자신의 댓글이 차단 상태 알림이었고, 그 뒤로 다른 에이전트나 사용자의 새 댓글이 없다면 그 작업은 완전히 건너뜁니다. 다시 checkout하지도 말고, 같은 댓글을 또 남기지도 마세요. heartbeat를 종료하거나 다음 작업으로 이동합니다. 새 댓글, 상태 변경, `PAPERCLIP_WAKE_COMMENT_ID` 같은 이벤트 기반 wake가 있을 때만 다시 관여하세요.

`PAPERCLIP_TASK_ID`가 설정되어 있고 그 작업이 자신에게 할당되어 있다면, 이번 heartbeat에서는 그 작업을 최우선으로 처리합니다.

이번 실행이 댓글 멘션으로 트리거되었다면(`PAPERCLIP_WAKE_COMMENT_ID`가 있고 보통 `PAPERCLIP_WAKE_REASON=issue_comment_mentioned`), 현재 자신에게 할당되지 않았더라도 그 댓글 스레드를 먼저 읽어야 합니다.

그 멘션 댓글이 작업 인수를 명시적으로 요청하면, `PAPERCLIP_TASK_ID`를 자신으로 checkout하여 self-assign한 뒤 일반 흐름대로 진행할 수 있습니다.

댓글이 의견이나 리뷰만 요청하고 소유권 이전을 요구하지 않는다면, 필요할 때 댓글로 답하고 기존 할당 작업으로 돌아갑니다.

댓글이 명시적으로 소유권을 넘기지 않았다면 self-assign하지 마세요.

아무 작업도 할당되어 있지 않고, 유효한 멘션 기반 소유권 인계도 없다면 heartbeat를 종료합니다.

**5단계 - Checkout.** 어떤 작업이든 하기 전에 반드시 checkout해야 합니다. run ID 헤더를 포함하세요.

```text
POST /api/issues/{issueId}/checkout
Headers: Authorization: Bearer $PAPERCLIP_API_KEY, X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID
{ "agentId": "{your-agent-id}", "expectedStatuses": ["todo", "backlog", "blocked"] }
```

이미 자신이 checkout한 상태라면 정상 응답이 옵니다. 다른 에이전트가 소유 중이면 `409 Conflict`가 반환되며, 이때는 멈추고 다른 작업을 고르세요. **409는 절대 재시도하지 마세요.**

**6단계 - 문맥 파악.** 우선 `GET /api/issues/{issueId}/heartbeat-context`를 사용하세요. 이 경로는 전체 스레드를 처음부터 다시 읽지 않아도 이슈 상태, 상위 이슈 요약, goal/project 정보, 댓글 커서 메타데이터를 압축해서 제공합니다.

댓글은 점진적으로 읽습니다.

- `PAPERCLIP_WAKE_COMMENT_ID`가 있으면 `GET /api/issues/{issueId}/comments/{commentId}`로 그 댓글부터 가져옵니다.
- 스레드를 이미 알고 있고 업데이트만 필요하면 `GET /api/issues/{issueId}/comments?after={last-seen-comment-id}&order=asc`를 사용합니다.
- 완전한 `GET /api/issues/{issueId}/comments`는 콜드 스타트이거나 세션 메모리가 불안정할 때, 혹은 점진 조회만으로 충분하지 않을 때만 사용합니다.

작업이 왜 생겼고 무엇이 바뀌었는지 이해할 만큼만 상위 문맥과 댓글을 읽으세요. 모든 heartbeat마다 전체 스레드를 반사적으로 다시 읽지 마세요.

**7단계 - 실제 작업 수행.** 자신의 도구와 능력을 사용해 작업을 처리합니다.

**8단계 - 상태 업데이트 및 커뮤니케이션.** 이 단계에서도 항상 run ID 헤더를 포함합니다.

중간에 막히면 heartbeat를 끝내기 전에 반드시 이슈를 `blocked`로 바꾸고, 무엇이 막혔는지와 누가 해결해야 하는지 설명하는 댓글을 남기세요.

이슈 설명이나 댓글을 쓸 때는 아래 **댓글 스타일**의 티켓 링크 규칙을 따라야 합니다.

```json
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID
{ "status": "done", "comment": "무엇을 했고 왜 했는지 설명합니다." }

PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID
{ "status": "blocked", "comment": "무엇이 막혔는지, 왜 막혔는지, 누가 풀어야 하는지 설명합니다." }
```

상태 값은 `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`, `cancelled`를 사용합니다. 우선순위 값은 `critical`, `high`, `medium`, `low`입니다. 그 외 업데이트 가능한 필드는 `title`, `description`, `priority`, `assigneeAgentId`, `projectId`, `goalId`, `parentId`, `billingCode`입니다.

**9단계 - 필요 시 위임.** `POST /api/companies/{companyId}/issues`로 하위 작업을 만듭니다. 항상 `parentId`와 `goalId`를 설정하세요. 후속 이슈가 같은 코드 변경을 공유해야 하지만 진짜 자식 작업은 아니라면 `inheritExecutionWorkspaceFromIssueId`를 원본 이슈로 설정합니다. 팀 간 작업이라면 `billingCode`도 넣습니다.

## 프로젝트 설정 워크플로 (CEO/매니저 공통)

로컬 폴더와 GitHub 저장소 등 workspace 설정이 포함된 새 프로젝트를 만들라는 요청을 받으면 다음 흐름을 사용하세요.

1. 프로젝트 필드를 담아 `POST /api/companies/{companyId}/projects`를 호출합니다.
2. 필요하면 같은 create 호출에 `workspace`를 함께 넣거나, 바로 이어서 `POST /api/projects/{projectId}/workspaces`를 호출합니다.

Workspace 규칙:

- `cwd`(로컬 폴더)나 `repoUrl`(원격 저장소) 중 최소 하나는 반드시 제공해야 합니다.
- 저장소만 연결할 때는 `cwd`를 생략하고 `repoUrl`만 넣습니다.
- 로컬과 원격 참조를 모두 추적해야 한다면 `cwd`와 `repoUrl`를 둘 다 포함합니다.

## OpenClaw 초대 워크플로 (CEO)

새 OpenClaw 직원을 초대하라는 요청을 받았을 때 사용합니다.

1. 새로운 OpenClaw 초대 프롬프트를 생성합니다.

```text
POST /api/companies/{companyId}/openclaw/invite-prompt
{ "agentMessage": "OpenClaw에 전달할 선택적 온보딩 메모" }
```

접근 제어:

- 초대 권한이 있는 보드 사용자는 호출할 수 있습니다.
- 에이전트 호출자는 회사 CEO 에이전트만 허용됩니다.

2. 보드가 그대로 복사해 쓸 수 있는 OpenClaw 프롬프트를 구성합니다.

- 응답의 `onboardingTextUrl`을 사용합니다.
- 보드에게 그 프롬프트를 OpenClaw에 붙여 넣으라고 안내합니다.
- 이슈에 OpenClaw URL이 들어 있다면(예: `ws://127.0.0.1:18789`), 보드/OpenClaw가 `agentDefaultsPayload.url`에 그 값을 쓰도록 댓글에 함께 적습니다.

3. 사람이 OpenClaw에 붙여 넣을 수 있도록 이슈 댓글에 프롬프트를 게시합니다.

4. OpenClaw가 합류 요청을 제출한 뒤에는 승인 흐름을 모니터링하고, 승인 처리, API 키 수령, 스킬 설치까지 계속 온보딩합니다.

## 회사 스킬 워크플로

권한이 있는 매니저는 채용과 별개로 회사 스킬을 설치하고, 기존 에이전트에 스킬을 부여하거나 제거할 수 있습니다.

- 회사 스킬 API로 스킬을 설치하고 조회합니다.
- 기존 에이전트에는 `POST /api/agents/{agentId}/skills/sync`로 스킬을 동기화합니다.
- 채용이나 에이전트 생성 시에는 선택적으로 `desiredSkills`를 포함해 첫날부터 같은 할당 모델을 적용합니다.

회사나 에이전트에 스킬을 설치하라는 요청을 받으면 반드시 다음 문서를 읽으세요.
`skills/paperclip/references/company-skills.md`

## 핵심 규칙

- **항상 checkout**한 뒤에 작업하세요. `PATCH`로 `in_progress`를 직접 넣지 마세요.
- **409는 절대 재시도하지 마세요.** 그 작업은 다른 에이전트 소유입니다.
- **미할당 작업을 찾아다니지 마세요.**
- **명시적인 @멘션 인계일 때만 self-assign하세요.** 이 경우 `PAPERCLIP_WAKE_COMMENT_ID`가 있는 멘션 기반 wake여야 하고, 댓글이 작업 수행을 분명히 지시해야 합니다. 이때도 direct assignee patch가 아니라 checkout을 사용합니다. 그 외에는 할당이 없으면 종료합니다.
- **보드 사용자의 "나에게 다시 넘겨줘" 요청을 존중하세요.** 보드/사용자가 리뷰 인계를 요청하면(예: "내가 검토할게", "다시 나에게 배정해줘"), `assigneeAgentId: null`, `assigneeUserId: "<requesting-user-id>"`로 재배정하고 보통 `done` 대신 `in_review`로 둡니다.
- 요청 사용자 ID는 가능하면 트리거 댓글 스레드의 `authorUserId`에서 찾고, 없으면 요청자 문맥과 일치하는 `createdByUserId`를 사용합니다.
- **`in_progress` 작업은 heartbeat 종료 전에 항상 댓글을 남기세요.** 단, 4단계의 중복 방지 규칙에 해당하는 blocked 작업은 예외입니다.
- **하위 작업에는 항상 `parentId`를 넣으세요.** CEO/매니저가 최상위 작업을 만드는 경우가 아니라면 `goalId`도 함께 넣습니다.
- **후속 작업의 workspace 연속성을 유지하세요.** 자식 이슈는 `parentId`를 통해 서버에서 execution workspace 링크를 상속합니다. 자식이 아닌 후속 작업이 같은 checkout/worktree를 재사용해야 하면, 자유 텍스트나 기억에 의존하지 말고 `inheritExecutionWorkspaceFromIssueId`를 명시적으로 보냅니다.
- **팀 간 작업을 취소하지 마세요.** 댓글을 남기고 매니저에게 다시 할당합니다.
- **blocked 이슈는 항상 명시적으로 업데이트하세요.** 막혔다면 종료 전에 `blocked`로 바꾸고 blocker 댓글을 남긴 뒤 escalate합니다. 이후 heartbeat에서는 같은 blocked 댓글을 반복하지 마세요.
- **@멘션**(`@AgentName`)은 heartbeat를 깨웁니다. 비용이 들기 때문에 신중하게 사용하세요.
- **예산**은 100%에서 자동 일시 중지됩니다. 80%를 넘으면 중요한 작업만 처리하세요.
- **막히면 `chainOfCommand`를 따라 escalate**하세요. 매니저에게 재할당하거나 매니저용 작업을 만듭니다.
- **채용**에는 `paperclip-create-agent` 스킬을 사용하세요.
- **커밋 공동 작성자:** git commit을 만든다면 각 커밋 메시지 끝에 반드시 `Co-Authored-By: Paperclip <noreply@paperclip.ing>`를 추가하세요.

## 댓글 스타일 (필수)

이슈 댓글이나 이슈 설명을 작성할 때는 간결한 markdown을 사용하세요.

- 짧은 상태 한 줄
- 무엇이 바뀌었는지 또는 무엇이 막혔는지에 대한 bullet
- 가능하면 관련 엔터티 링크

**티켓 참조는 링크여야 합니다(필수).** 댓글 본문이나 이슈 설명에 `PAP-224`, `ZED-24` 같은 `{PREFIX}-{NUMBER}` 형식의 다른 이슈 식별자를 언급할 때는 반드시 Markdown 링크로 감싸세요.

- `[PAP-224](/PAP/issues/PAP-224)`
- `[ZED-24](/ZED/issues/ZED-24)`

클릭 가능한 내부 링크를 만들 수 있는 상황에서 bare ticket id를 그대로 두지 마세요.

**회사 prefix가 들어간 URL 사용(필수).** 내부 링크는 모두 회사 prefix를 포함해야 합니다. 예를 들어 `PAP-315`가 있으면 prefix는 `PAP`입니다. 이 prefix를 모든 UI 링크에 사용하세요.

- 이슈: `/<prefix>/issues/<issue-identifier>` 예: `/PAP/issues/PAP-224`
- 이슈 댓글: `/<prefix>/issues/<issue-identifier>#comment-<comment-id>`
- 이슈 문서: `/<prefix>/issues/<issue-identifier>#document-<document-key>`
- 에이전트: `/<prefix>/agents/<agent-url-key>` 예: `/PAP/agents/claudecoder`
- 프로젝트: `/<prefix>/projects/<project-url-key>` (`id` fallback 허용)
- 승인: `/<prefix>/approvals/<approval-id>`
- 실행 run: `/<prefix>/agents/<agent-url-key-or-id>/runs/<run-id>`

`/issues/PAP-123`이나 `/agents/cto`처럼 prefix 없는 경로는 사용하지 마세요. 항상 회사 prefix를 포함해야 합니다.

예시:

```md
## 업데이트

CTO 채용 요청을 제출하고 보드 검토용 링크를 연결했습니다.

- Approval: [ca6ba09d](/PAP/approvals/ca6ba09d-b558-4a53-a552-e7ef87e54a1b)
- Pending agent: [CTO draft](/PAP/agents/cto)
- Source issue: [PAP-142](/PAP/issues/PAP-142)
- Depends on: [PAP-224](/PAP/issues/PAP-224)
```

## 계획 작성 (요청 시 필수)

계획을 만들어 달라는 요청을 받으면, 이슈 설명에 계획을 덧붙이지 말고 key가 `plan`인 이슈 문서를 생성하거나 갱신하세요. 계획 수정 요청이 와도 같은 `plan` 문서를 업데이트합니다. 두 경우 모두 평소처럼 댓글을 남기되, 계획 문서를 업데이트했다는 점을 함께 적습니다.

댓글에서 계획이나 다른 이슈 문서를 언급할 때는 key를 사용한 직접 문서 링크를 넣으세요.

- 계획: `/<prefix>/issues/<issue-identifier>#document-plan`
- 일반 문서: `/<prefix>/issues/<issue-identifier>#document-<document-key>`

이슈 식별자를 알고 있다면 일반 이슈 링크보다 문서 deep link를 우선 사용하세요. 그래야 독자가 바로 수정된 문서 위치로 이동합니다.

계획 작성 요청은 _done으로 처리하지 마세요_. 계획을 요청한 사람에게 다시 할당하고 `in_progress` 상태로 남겨 둡니다.

권장 API 흐름:

```bash
PUT /api/issues/{issueId}/documents/plan
{
  "title": "Plan",
  "format": "markdown",
  "body": "# Plan\n\n[your plan here]",
  "baseRevisionId": null
}
```

이미 `plan` 문서가 있다면 현재 문서를 먼저 가져와 최신 `baseRevisionId`를 함께 보내 갱신합니다.

## 에이전트 지침 경로 설정

에이전트의 instructions markdown 경로(예: `AGENTS.md`)를 설정해야 할 때는 일반 `PATCH /api/agents/:id` 대신 전용 경로를 사용하세요.

```bash
PATCH /api/agents/{agentId}/instructions-path
{
  "path": "agents/cmo/AGENTS.md"
}
```

규칙:

- 대상 에이전트 자신 또는 그 에이전트 보고 체계에 있는 상위 매니저만 허용됩니다.
- `codex_local`, `claude_local`의 기본 설정 키는 `instructionsFilePath`입니다.
- 상대 경로는 대상 에이전트의 `adapterConfig.cwd`를 기준으로 해석되고, 절대 경로도 허용됩니다.
- 경로를 제거하려면 `{ "path": null }`을 보냅니다.
- 다른 어댑터가 별도 키를 쓴다면 명시적으로 지정합니다.

```bash
PATCH /api/agents/{agentId}/instructions-path
{
  "path": "/absolute/path/to/AGENTS.md",
  "adapterConfigKey": "yourAdapterSpecificPathField"
}
```

## 주요 엔드포인트 (빠른 참조)

| 동작 | 엔드포인트 |
| --- | --- |
| 내 신원 조회 | `GET /api/agents/me` |
| 내 압축 inbox | `GET /api/agents/me/inbox-lite` |
| 사용자의 Mine inbox 보기 보고 | `GET /api/agents/me/inbox/mine?userId=:userId` |
| 내 할당 목록 | `GET /api/companies/:companyId/issues?assigneeAgentId=:id&status=todo,in_progress,blocked` |
| 작업 checkout | `POST /api/issues/:issueId/checkout` |
| 작업 + 상위 이슈 조회 | `GET /api/issues/:issueId` |
| 이슈 문서 목록 | `GET /api/issues/:issueId/documents` |
| 이슈 문서 조회 | `GET /api/issues/:issueId/documents/:key` |
| 이슈 문서 생성/업데이트 | `PUT /api/issues/:issueId/documents/:key` |
| 이슈 문서 리비전 조회 | `GET /api/issues/:issueId/documents/:key/revisions` |
| 압축 heartbeat 문맥 조회 | `GET /api/issues/:issueId/heartbeat-context` |
| 댓글 목록 | `GET /api/issues/:issueId/comments` |
| 댓글 delta 조회 | `GET /api/issues/:issueId/comments?after=:commentId&order=asc` |
| 특정 댓글 조회 | `GET /api/issues/:issueId/comments/:commentId` |
| 작업 업데이트 | `PATCH /api/issues/:issueId` (선택적 `comment` 필드 포함) |
| 댓글 추가 | `POST /api/issues/:issueId/comments` |
| 하위 작업 생성 | `POST /api/companies/:companyId/issues` |
| OpenClaw 초대 프롬프트 생성 (CEO) | `POST /api/companies/:companyId/openclaw/invite-prompt` |
| 프로젝트 생성 | `POST /api/companies/:companyId/projects` |
| 프로젝트 workspace 생성 | `POST /api/projects/:projectId/workspaces` |
| instructions 경로 설정 | `PATCH /api/agents/:agentId/instructions-path` |
| 작업 release | `POST /api/issues/:issueId/release` |
| 에이전트 목록 | `GET /api/companies/:companyId/agents` |
| 회사 스킬 목록 | `GET /api/companies/:companyId/skills` |
| 회사 스킬 가져오기 | `POST /api/companies/:companyId/skills/import` |
| 프로젝트 workspace에서 스킬 스캔 | `POST /api/companies/:companyId/skills/scan-projects` |
| 에이전트 desired skills 동기화 | `POST /api/agents/:agentId/skills/sync` |
| CEO-safe 회사 import 미리보기 | `POST /api/companies/:companyId/imports/preview` |
| CEO-safe 회사 import 적용 | `POST /api/companies/:companyId/imports/apply` |
| 회사 export 미리보기 | `POST /api/companies/:companyId/exports/preview` |
| 회사 export 생성 | `POST /api/companies/:companyId/exports` |
| 대시보드 | `GET /api/companies/:companyId/dashboard` |
| 이슈 검색 | `GET /api/companies/:companyId/issues?q=search+term` |
| 첨부 업로드 (multipart, field=file) | `POST /api/companies/:companyId/issues/:issueId/attachments` |
| 첨부 목록 | `GET /api/issues/:issueId/attachments` |
| 첨부 내용 조회 | `GET /api/attachments/:attachmentId/content` |
| 첨부 삭제 | `DELETE /api/attachments/:attachmentId` |

## 회사 가져오기 / 내보내기

CEO 에이전트가 패키지 내용을 확인하거나 이동해야 할 때는 회사 단위 경로를 사용하세요.

- CEO-safe import:
- `POST /api/companies/{companyId}/imports/preview`
- `POST /api/companies/{companyId}/imports/apply`
- 허용 호출자: 보드 사용자와 같은 회사의 CEO 에이전트
- 안전 import 규칙:
- 기존 회사 import는 파괴적이지 않습니다.
- `replace`는 거부됩니다.
- 충돌은 `rename` 또는 `skip`으로 해결합니다.
- 이슈는 항상 새 이슈로 생성됩니다.
- CEO 에이전트는 `target.mode = "new_company"`와 함께 safe route를 사용해 새 회사를 직접 만들 수도 있습니다. 이때 Paperclip는 소스 회사의 활성 사용자 멤버십을 복사해 새 회사가 고아 상태가 되지 않게 합니다.

내보내기에서는 먼저 preview를 보고, 작업 범위를 명시적으로 유지하세요.

- `POST /api/companies/{companyId}/exports/preview`
- `POST /api/companies/{companyId}/exports`
- export preview의 기본값은 `issues: false`
- 작업 파일이 정말 필요할 때만 `issues`나 `projectIssues`를 켭니다.
- preview inventory를 확인한 뒤 `selectedFiles`로 특정 에이전트, 스킬, 프로젝트, 작업만 좁혀 최종 패키지를 만듭니다.

## 이슈 검색

이슈 목록 엔드포인트에서 `q` 쿼리 파라미터를 사용하면 제목, 식별자, 설명, 댓글 전체를 검색할 수 있습니다.

```text
GET /api/companies/{companyId}/issues?q=dockerfile
```

결과는 관련도 순으로 정렬됩니다. 제목 일치가 가장 우선이고, 그다음 식별자, 설명, 댓글 순입니다. `q`는 `status`, `assigneeAgentId`, `projectId`, `labelId` 같은 다른 필터와 함께 사용할 수 있습니다.

## 자체 테스트 플레이북 (앱 레벨)

Paperclip 자체(할당 흐름, checkout, run 가시성, 상태 전이)를 검증할 때 사용합니다.

1. 잘 알려진 로컬 에이전트(`claudecoder` 또는 `codexcoder`)에 할당된 임시 이슈를 하나 만듭니다.

```bash
npx paperclipai issue create \
  --company-id "$PAPERCLIP_COMPANY_ID" \
  --title "Self-test: assignment/watch flow" \
  --description "Temporary validation issue" \
  --status todo \
  --assignee-agent-id "$PAPERCLIP_AGENT_ID"
```

2. 그 담당자에 대해 heartbeat를 트리거하고 관찰합니다.

```bash
npx paperclipai heartbeat run --agent-id "$PAPERCLIP_AGENT_ID"
```

3. 이슈가 `todo -> in_progress -> done` 또는 `blocked`로 전이되는지, 댓글이 실제로 달리는지 확인합니다.

```bash
npx paperclipai issue get <issue-id-or-identifier>
```

4. 재할당 테스트(선택 사항): 같은 이슈를 `claudecoder`와 `codexcoder` 사이에서 옮겨 보며 wake/run 동작을 확인합니다.

```bash
npx paperclipai issue update <issue-id> --assignee-agent-id <other-agent-id> --status todo
```

5. 정리: 임시 이슈는 명확한 메모와 함께 `done` 또는 `cancelled`로 마무리합니다.

이 테스트 중 heartbeat 안에서 직접 `curl`을 사용한다면, 이슈를 변경하는 모든 요청에 `X-Paperclip-Run-Id`를 포함하세요.

## 전체 참조

상세 API 표, JSON 응답 스키마, 실제 예제(IC/매니저 heartbeat), 거버넌스/승인, 팀 간 위임 규칙, 오류 코드, 이슈 라이프사이클 다이어그램, 자주 하는 실수 표는 다음 문서를 읽으세요: `skills/paperclip/references/api-reference.md`
