# 3. Event 필드 정제 및 `data/` 반영

[← 허브로](../ADD_EVENT.md)

크롤러가 넣는 `Event` 문자열(예: `그란폰도 (96.9km)`)을 **DB에 넣은 코스명**과 동일하게 맞춥니다.  
(참가자 추세·기록 분포·기록으로 찾기가 이 문자열/코스명 매칭에 의존합니다.)

1. `data/preliminary/...json`을 열어 코스별 라벨을 확인합니다.
2. 치환·스크립트 등으로 정제합니다.
3. 최종 파일을 **`data/{slug}_{연도}.json`** 으로 저장합니다.
   - 예: `data/dinosour_2026.json`
   - `slug`는 DB 이벤트 slug와 동일하게 두는 것이 관례입니다.

> `preliminary`만 두고 `data/`에 복사하지 않으면 다음 단계 스크립트가 읽지 않습니다.

다음: [sorted-msec 생성](./sorted-msec.md)
