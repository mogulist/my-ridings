# @my-ridings/ui

모노레포 공용 UI 패키지. Shadcn 스타일 컴포넌트(Button, DropdownMenu 등)를 제공한다.

## 사용

앱에서는 이 패키지만 의존하고, Radix/CVA 등은 직접 두지 않는다.

```json
{
  "dependencies": {
    "@my-ridings/ui": "workspace:*"
  }
}
```

```tsx
import { Button } from "@my-ridings/ui";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@my-ridings/ui";
```

앱의 Tailwind가 이 패키지의 클래스를 스캔하도록 설정해야 한다. (Tailwind v4: `@source`로 패키지 경로 포함)

## 새 Shadcn 컴포넌트 추가

- **반드시 이 디렉터리(`packages/ui`)에서만** 추가한다. 앱(`apps/*`)에 추가하지 않는다.
- 이 패키지를 Shadcn이 인식하는 구조로 두고, 다음처럼 실행한다.

```bash
cd packages/ui
npx shadcn@latest add <컴포넌트명>
```

- 새 의존성이 생기면 `packages/ui/package.json`에만 추가된다. 그 다음 **레포 루트**에서 `bun install` 한 번 실행.
