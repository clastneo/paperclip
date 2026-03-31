# 데이터베이스

Paperclip은 [Drizzle ORM](https://orm.drizzle.team/)을 통해 PostgreSQL을 사용합니다. 가장 간단한 방식부터 운영 환경에 가까운 방식까지, 데이터베이스를 실행하는 방법은 세 가지가 있습니다.

## 1. 내장 PostgreSQL - 설정 없음

`DATABASE_URL`을 설정하지 않으면 서버가 자동으로 내장 PostgreSQL 인스턴스를 시작하고 로컬 데이터 디렉터리를 관리합니다.

```sh
pnpm dev
```

이것만으로 충분합니다. 첫 실행 시 서버는 다음을 수행합니다.

1. 저장용 `~/.paperclip/instances/default/db/` 디렉터리를 만듭니다.
2. `paperclip` 데이터베이스가 존재하는지 확인합니다.
3. 빈 데이터베이스라면 마이그레이션을 자동 적용합니다.
4. 요청을 서빙하기 시작합니다.

데이터는 `~/.paperclip/instances/default/db/`에 저장되며 재시작 후에도 유지됩니다. 로컬 개발 데이터를 초기화하려면 해당 디렉터리를 삭제하세요.

대기 중인 마이그레이션을 수동으로 적용해야 한다면 다음을 실행합니다.

```sh
pnpm db:migrate
```

`DATABASE_URL`이 비어 있으면 이 명령은 현재 활성 Paperclip config/instance의 내장 PostgreSQL 인스턴스를 대상으로 동작합니다.

이 모드는 로컬 개발과 원커맨드 설치에 가장 적합합니다.

Docker 참고: Docker 빠른 시작 이미지도 기본적으로 내장 PostgreSQL을 사용합니다. 컨테이너 재시작 후에도 DB 상태를 유지하려면 `/paperclip`을 영속화하세요. 자세한 내용은 `doc/DOCKER.md`를 참고하세요.

## 2. 로컬 PostgreSQL (Docker)

로컬에서 완전한 PostgreSQL 서버를 쓰고 싶다면 포함된 Docker Compose 구성을 사용하세요.

```sh
docker compose up -d
```

이 명령은 `localhost:5432`에서 PostgreSQL 17을 시작합니다. 그다음 연결 문자열을 설정합니다.

```sh
cp .env.example .env
# .env에는 이미 다음이 포함되어 있습니다:
# DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip
```

마이그레이션을 실행하거나(`db:generate` 문제가 해결된 뒤), `drizzle-kit push`를 사용할 수 있습니다.

```sh
DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip \
  npx drizzle-kit push
```

그다음 서버를 시작합니다.

```sh
pnpm dev
```

## 3. 호스팅 PostgreSQL (Supabase)

운영 환경에서는 호스팅 PostgreSQL 제공자를 사용하는 것이 좋습니다. [Supabase](https://supabase.com/)는 무료 티어가 있어 좋은 선택지입니다.

### 설정

1. [database.new](https://database.new)에서 프로젝트를 만듭니다.
2. **Project Settings > Database > Connection string**으로 이동합니다.
3. URI를 복사하고 비밀번호 자리 표시자를 실제 비밀번호로 바꿉니다.

### 연결 문자열

Supabase는 두 가지 연결 방식을 제공합니다.

**직접 연결** (포트 5432): 마이그레이션과 일회성 스크립트에 사용

```text
postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

**Supavisor 연결 풀링** (포트 6543): 애플리케이션 실행에 사용

```text
postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

### 구성

`.env`에 `DATABASE_URL`을 설정합니다.

```sh
DATABASE_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

연결 풀링(포트 6543)을 사용할 때는 `postgres` 클라이언트에서 prepared statement를 꺼야 합니다. `packages/db/src/client.ts`를 다음처럼 조정합니다.

```ts
export function createDb(url: string) {
  const sql = postgres(url, { prepare: false });
  return drizzlePg(sql, { schema });
}
```

### 스키마 반영

```sh
# 스키마 변경에는 직접 연결(포트 5432)을 사용하세요
DATABASE_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@...5432/postgres \
  npx drizzle-kit push
```

### 무료 티어 제한

- 데이터베이스 저장공간 500MB
- 동시 연결 200개
- 1주일 이상 비활성 상태면 프로젝트 일시중지

최신 정보는 [Supabase pricing](https://supabase.com/pricing)을 참고하세요.

## 모드 전환

데이터베이스 모드는 `DATABASE_URL` 값으로 결정됩니다.

| `DATABASE_URL` | 모드 |
| --- | --- |
| 설정하지 않음 | 내장 PostgreSQL (`~/.paperclip/instances/default/db/`) |
| `postgres://...localhost...` | 로컬 Docker PostgreSQL |
| `postgres://...supabase.com...` | 호스팅 Supabase |

어떤 모드를 쓰든 Drizzle 스키마(`packages/db/src/schema/`)는 동일합니다.

## 시크릿 저장소

Paperclip은 다음 테이블에 시크릿 메타데이터와 버전을 저장합니다.

- `company_secrets`
- `company_secret_versions`

로컬/기본 설치에서는 활성 provider가 `local_encrypted`입니다.

- 시크릿 값은 로컬 마스터 키로 암호화되어 저장됩니다.
- 기본 키 파일 경로: `~/.paperclip/instances/default/secrets/master.key` (없으면 자동 생성)
- CLI 설정 위치: `~/.paperclip/instances/default/config.json`의 `secrets.localEncrypted.keyFilePath`

선택적 override:

- `PAPERCLIP_SECRETS_MASTER_KEY` (32바이트 키를 base64, hex, 또는 32자 raw 문자열로 지정)
- `PAPERCLIP_SECRETS_MASTER_KEY_FILE` (사용자 지정 키 파일 경로)

새로운 민감한 환경 변수를 인라인으로 받지 않게 하려면 strict mode를 사용합니다.

```sh
PAPERCLIP_SECRETS_STRICT_MODE=true
```

strict mode와 provider 기본값은 다음 명령으로 설정할 수 있습니다.

```sh
pnpm paperclipai configure --section secrets
```

기존 인라인 시크릿을 마이그레이션하려면:

```sh
pnpm secrets:migrate-inline-env --apply
```
