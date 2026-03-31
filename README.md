<p align="center">
  <img src="doc/assets/header.png" alt="Paperclip" width="720" />
</p>

<p align="center">
  <a href="#개인-사용-저장소-안내"><strong>저장소 안내</strong></a> &middot;
  <a href="#빠른-시작"><strong>빠른 시작</strong></a> &middot;
  <a href="https://paperclip.ing/docs"><strong>공식 문서</strong></a> &middot;
  <a href="https://github.com/paperclipai/paperclip"><strong>공식 GitHub</strong></a> &middot;
  <a href="https://discord.gg/m4HZY7xNG3"><strong>Discord</strong></a>
</p>

<p align="center">
  <a href="https://github.com/paperclipai/paperclip/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
  <a href="https://github.com/paperclipai/paperclip/stargazers"><img src="https://img.shields.io/github/stars/paperclipai/paperclip?style=flat" alt="Stars" /></a>
  <a href="https://discord.gg/m4HZY7xNG3"><img src="https://img.shields.io/discord/000000000?label=discord" alt="Discord" /></a>
</p>

<br/>

<div align="center">
  <video src="https://github.com/user-attachments/assets/773bdfb2-6d1e-4e30-8c5f-3487d5b70c8f" width="600" controls></video>
</div>

<br/>

## 개인 사용 저장소 안내

이 저장소는 **공식 `paperclipai/paperclip` 저장소를 기반으로 한 개인 사용 목적의 포크**입니다.

- 개인 실험, 설정 조정, 한국어 번역, 사용 편의성 개선이 포함될 수 있습니다.
- **공식 배포본이나 공식 지원용 저장소가 아닙니다.**
- 일반 사용자나 팀에서 안정적인 기준을 찾는 경우에는 **공식 저장소와 공식 문서**를 우선 참고하는 것을 권장합니다.

공식 프로젝트:

- 공식 저장소: `https://github.com/paperclipai/paperclip`
- 공식 문서: `https://paperclip.ing/docs`

## Paperclip이란?

Paperclip은 **자율형 AI 회사**를 운영하기 위한 컨트롤 플레인입니다.

OpenClaw, Claude Code, Codex, Cursor 같은 다양한 에이전트를 하나의 회사 구조 안에서 조직하고, 목표를 연결하고, 작업을 추적하고, 비용과 예산을 관리할 수 있게 해 줍니다.

겉으로는 작업 관리 도구처럼 보일 수 있지만, 실제로는 다음을 다룹니다.

- 조직도와 보고 체계
- 이슈/댓글 기반 작업 흐름
- heartbeat 기반 실행 모델
- 예산과 비용 통제
- 승인과 거버넌스
- 회사 단위 운영 시야

한마디로 말하면:

> OpenClaw가 직원이라면, Paperclip은 회사입니다.

## 이런 사람에게 잘 맞습니다

- 여러 AI 에이전트를 하나의 목표 아래에서 함께 움직이고 싶을 때
- 에이전트에게 일을 맡기되, 사람이 계속 감독하고 개입할 수 있어야 할 때
- 비용을 추적하고 예산을 강제하고 싶을 때
- 단순한 채팅이 아니라 “누가 무엇을 왜 하고 있는지”가 보여야 할 때
- 개인 프로젝트를 넘어 팀, 조직, 회사 수준의 구조가 필요할 때

## 핵심 개념

### 회사

Paperclip의 기본 단위는 회사입니다. 하나의 인스턴스에서 여러 회사를 운영할 수 있고, 모든 핵심 데이터는 회사 단위로 분리됩니다.

### 에이전트

모든 직원은 에이전트입니다. 각 에이전트는 역할, 보고 대상, 어댑터 설정, 작업 범위를 가집니다.

### 목표와 작업

모든 작업은 더 큰 목표에 연결되어야 합니다. 에이전트는 단순히 “무엇을 해야 하는지”만이 아니라 “왜 하는지”까지 알 수 있어야 합니다.

### Heartbeat

에이전트는 스케줄 또는 이벤트에 따라 깨어나 현재 작업을 확인하고, 필요한 행동을 한 뒤 다시 종료합니다.

### 비용과 거버넌스

예산, 승인, 활동 로그를 통해 자율 실행을 통제할 수 있습니다. 완전 자동화가 가능하더라도 사람의 개입 지점은 분명하게 남아 있습니다.

## 주요 기능

- 다양한 에이전트 런타임 연결
- 회사/조직 단위 운영 모델
- 작업, 댓글, 승인 중심의 운영 흐름
- 실시간 활동 추적
- 비용 집계와 예산 강제
- 목표 정렬과 상위 맥락 전달
- 다중 회사 지원
- 모바일에서도 확인 가능한 운영 UI

## 빠른 시작

### 일반 사용자에게 권장

공식 프로젝트 기준으로 시작하려면 공식 저장소와 공식 문서를 참고하세요.

- 공식 저장소: `https://github.com/paperclipai/paperclip`
- 공식 문서: `https://paperclip.ing/docs`

### 로컬에서 바로 실행

```bash
npx paperclipai onboard --yes
```

이미 Paperclip 설정이 있다면 `onboard`를 다시 실행해도 기존 설정은 유지됩니다. 설정을 바꾸고 싶다면 `paperclipai configure`를 사용하세요.

직접 클론해서 실행하려면:

```bash
git clone https://github.com/paperclipai/paperclip.git
cd paperclip
pnpm install
pnpm dev
```

이 명령은 기본적으로 `http://localhost:3100`에서 서버를 시작합니다.

요구사항:

- Node.js 20+
- pnpm 9.15+

## 개발

```bash
pnpm dev
pnpm dev:once
pnpm dev:server
pnpm build
pnpm typecheck
pnpm test:run
pnpm db:generate
pnpm db:migrate
```

추가 정보:

- 개발 가이드: [doc/DEVELOPING.md](doc/DEVELOPING.md)
- 데이터베이스 가이드: [doc/DATABASE.md](doc/DATABASE.md)
- 구현 기준: [doc/SPEC-implementation.md](doc/SPEC-implementation.md)

## 이 포크에서 기대할 수 있는 점

이 저장소는 개인 사용 목적의 포크이므로 다음이 포함될 수 있습니다.

- 한국어 문서화
- 개인 워크플로에 맞춘 설정 변경
- 실험적 UI/문구 조정
- 공식 upstream에 아직 반영되지 않은 임시 패치

따라서:

- 공식 기능 기준은 upstream 문서를 우선 보세요.
- 이 저장소의 변경은 개인 목적에 맞춰 달라질 수 있습니다.

## 커뮤니티

- 공식 프로젝트: `paperclipai/paperclip`
- Discord: `https://discord.gg/m4HZY7xNG3`
- 기여 가이드: [CONTRIBUTING.md](CONTRIBUTING.md)
