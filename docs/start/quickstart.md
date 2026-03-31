---
title: 빠른 시작
summary: 몇 분 안에 이 Paperclip 포크를 실행합니다
---

이 Paperclip 포크를 5분 안에 로컬에서 실행할 수 있습니다.

## 빠른 시작

```sh
git clone https://github.com/clastneo/paperclip.git
cd paperclip
pnpm install
pnpm onboard --yes
pnpm paperclip:run
```

이 방법은 clone한 포크 저장소를 직접 사용하므로, 온보딩과 기본 자산도 이 저장소 기준으로 적용됩니다.

이미 Paperclip 설정이 있다면 `onboard`를 다시 실행해도 현재 설정과 데이터 경로는 유지됩니다. 설정을 수정하려면 `paperclipai configure`를 사용하세요.

나중에 clone한 포크에서 다시 실행하려면:

```sh
pnpm paperclip:run
```

> 참고: `npx paperclipai ...`는 upstream npm 패키지를 설치해 실행하므로, 이 포크의 번역된 온보딩 자산을 사용하지 않습니다. 이 포크에서는 위의 clone 기준 명령을 사용하세요.

## 로컬 개발

이 포크 자체를 개발할 때 사용하는 경로입니다. 요구 사항은 Node.js 20+와 pnpm 9+입니다.

이 포크를 개발 중이라면 저장소를 clone한 뒤 다음 명령을 실행하세요.

```sh
pnpm install
pnpm dev
```

이 명령은 API 서버와 UI를 [http://localhost:3100](http://localhost:3100)에서 시작합니다.

별도 외부 데이터베이스는 필요하지 않습니다. Paperclip은 기본적으로 내장 PostgreSQL 인스턴스를 사용합니다.

clone한 저장소에서 바로 CLI를 쓰고 싶다면 다음 명령도 사용할 수 있습니다.

```sh
pnpm onboard --yes
pnpm paperclip:run
```

이 명령은 설정이 없으면 자동 온보딩을 수행하고, 필요한 점검과 자동 복구를 거친 뒤 서버를 시작합니다.

## 다음 단계

Paperclip이 실행되면 다음 순서로 진행하면 됩니다.

1. 웹 UI에서 첫 회사를 만듭니다.
2. 회사 목표를 정의합니다.
3. CEO 에이전트를 만들고 어댑터를 설정합니다.
4. 필요한 에이전트를 추가해 조직도를 구성합니다.
5. 예산을 설정하고 초기 작업을 할당합니다.
6. 실행을 시작하면 에이전트가 heartbeat를 돌며 회사를 운영하기 시작합니다.

<Card title="핵심 개념" href="/start/core-concepts">
  Paperclip의 핵심 개념 살펴보기
</Card>
