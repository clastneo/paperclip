---
name: paperclip-create-plugin
description: >
  현재 alpha SDK/runtime를 기준으로 새 Paperclip 플러그인을 만듭니다.
  플러그인 패키지를 스캐폴딩하거나, 새 예제 플러그인을 추가하거나,
  플러그인 작성 문서를 갱신할 때 사용하세요. 지원되는 worker/UI 범위,
  라우트 규칙, 스캐폴드 흐름, 검증 단계를 다룹니다.
---

# Paperclip 플러그인 만들기

Paperclip 플러그인을 생성, 스캐폴딩, 문서화하는 작업일 때 이 스킬을 사용하세요.

## 1. 기본 원칙

필요할 때 다음 문서를 먼저 읽으세요.

1. `doc/plugins/PLUGIN_AUTHORING_GUIDE.md`
2. `packages/plugins/sdk/README.md`
3. `doc/plugins/PLUGIN_SPEC.md`: 미래 지향 맥락이 필요할 때만 참고

현재 런타임 가정:

- 플러그인 worker는 신뢰된 코드이다
- 플러그인 UI는 same-origin 호스트 안에서 동작하는 신뢰 코드이다
- worker API는 capability 기반으로 제한된다
- 플러그인 UI는 manifest capability로 샌드박싱되지 않는다
- 아직 호스트가 제공하는 공용 플러그인 UI 컴포넌트 키트는 없다
- 현재 런타임에서는 `ctx.assets`를 지원하지 않는다

## 2. 권장 작업 흐름

보일러플레이트를 손으로 쓰지 말고 스캐폴드 패키지를 사용하세요.

```bash
pnpm --filter @paperclipai/create-paperclip-plugin build
node packages/plugins/create-paperclip-plugin/dist/index.js <npm-package-name> --output <target-dir>
```

Paperclip 저장소 밖에서 사는 플러그인이라면 `--sdk-path`를 넘겨서 로컬 SDK/shared 패키지를
`.paperclip-sdk/`에 스냅샷하도록 하세요.

```bash
pnpm --filter @paperclipai/create-paperclip-plugin build
node packages/plugins/create-paperclip-plugin/dist/index.js @acme/plugin-name \
  --output /absolute/path/to/plugin-repos \
  --sdk-path /absolute/path/to/paperclip/packages/plugins/sdk
```

이 저장소 안에서 권장되는 위치:

- 예제 플러그인: `packages/plugins/examples/`
- 실제 패키지로 발전할 경우: `packages/plugins/<name>/`

## 3. 스캐폴딩 후 확인할 것

다음 파일을 점검하고 조정하세요.

- `src/manifest.ts`
- `src/worker.ts`
- `src/ui/index.tsx`
- `tests/plugin.spec.ts`
- `package.json`

플러그인이 다음 조건을 만족하는지 확인하세요.

- 지원되는 capability만 선언한다
- `ctx.assets`를 사용하지 않는다
- 호스트 UI 컴포넌트 스텁을 import하지 않는다
- UI가 자체 완결적이다
- `routePath`는 `page` 슬롯에서만 사용한다
- 개발 중에는 Paperclip에 절대 로컬 경로로 설치한다

## 4. 앱 안에 플러그인을 노출해야 한다면

번들 예제나 탐색 가능한 동작으로 드러나야 한다면, 관련 호스트 배선을 업데이트하세요.

- 번들 예제 목록: `server/src/routes/plugins.ts`
- 저장소 내 예제를 나열하는 문서들

사용자가 번들 예제로 노출해 달라고 한 경우에만 이 작업을 하세요.

## 5. 검증

항상 다음을 실행하세요.

```bash
pnpm --filter <plugin-package> typecheck
pnpm --filter <plugin-package> test
pnpm --filter <plugin-package> build
```

SDK/호스트/플러그인 런타임 코드도 함께 바꿨다면, 필요에 따라 더 넓은 저장소 검증도 실행하세요.

## 6. 문서 작성 기준

플러그인 문서를 작성하거나 업데이트할 때:

- 현재 구현과 미래 스펙 아이디어를 분리해서 쓸 것
- 신뢰 코드 모델을 명확히 설명할 것
- 호스트 UI 컴포넌트나 asset API를 약속하지 말 것
- 운영 환경에서는 저장소 로컬 흐름보다 npm 패키지 배포 가이드를 우선할 것
