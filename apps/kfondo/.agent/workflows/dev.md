---
description: 개발 서버 실행 및 프로젝트 기본 설정
---

# 프로젝트 개발 가이드

## 패키지 매니저

**이 프로젝트에서는 항상 `bun`을 사용합니다.** npm 또는 yarn을 사용하지 마세요.

## 개발 서버 실행

// turbo
```bash
bun run dev
```

## 의존성 설치

// turbo
```bash
bun install
```

## 패키지 추가

```bash
bun add <package-name>
```

## 개발 의존성 추가

```bash
bun add -d <package-name>
```

## 빌드

// turbo
```bash
bun run build
```

## 테스트 실행

// turbo
```bash
bun run test
```
