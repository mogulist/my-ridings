---
trigger: model_decision
description: Package manager rules for this project
globs: ["**/*"]
---

# Package Manager: Bun Only

이 프로젝트는 **bun**만 사용합니다. 다른 패키지 매니저를 사용하지 마세요.

## 규칙

- 패키지 설치: `bun add <package>` 또는 `bun install`
- 개발 의존성: `bun add -d <package>`
- 스크립트 실행: `bun run <script>`
- 타입스크립트 파일 직접 실행: `bun run <file.ts>`

## 금지 사항

- `npm install`, `npm add` 사용 금지
- `yarn add`, `yarn install` 사용 금지  
- `pnpm add`, `pnpm install` 사용 금지

## 예시

```bash
# 패키지 설치
bun add @supabase/supabase-js

# 개발 의존성 설치
bun add -d typescript

# 스크립트 실행
bun run dev
bun run build

# TS 파일 직접 실행
bun run scripts/migrate-events.ts
```