# My Ridings

자전거 타는데 필요한 개인 취미 프로젝트들을 모아 둔 모노레포입니다.
빌드·실행은 [Turborepo](https://turbo.build/)로 관리한다.

## 패키지

| 패키지 | 설명 |
|--------|------|
| [packages/ui](./packages/ui) | 공용 UI (Shadcn 스타일 컴포넌트). **새 UI/Shadcn 컴포넌트는 여기에만 추가**하고, 앱에서는 `@my-ridings/ui`로 import 한다. 자세한 규칙은 [packages/ui/README.md](./packages/ui/README.md) 참고. |

## 앱

| 앱                                    | 설명                                                        |
| ------------------------------------- | ----------------------------------------------------------- |
| [plan-my-route](./apps/plan-my-route) | 여러 날에 걸친 엔듀어런스 라이딩을 위한 경로·숙박 계획 도구 |

앱은 차차 추가할 예정.

## 개발

```bash
bun install
bun dev
```

특정 앱만 실행하려면:

```bash
bun --filter @plan-my-route/plan-my-route dev
```

## 스크립트

- `bun dev` — 모든 앱 개발 서버 (Turbo)
- `bun build` — 전체 빌드
- `bun start` — 빌드 후 실행
- `bun lint` — 린트
