# 7. 검증 체크리스트

[← 허브로](../ADD_EVENT.md)

- [ ] `data/{slug}_{연도}.json`에 `Event` 값이 **DB 코스명**(또는 매칭 규칙)과 일치
- [ ] `data/sorted-msec/{slug}_{연도}.json` 생성·갱신 완료
- [ ] (KOM이 있는 경우) `data/sorted-msec/{slug}_{연도}_kom.json` 생성 및 Blob **KOM 원본·KOM 정렬** 업로드
- [ ] (KOM이 있는 경우) 해당 코스의 **`courses.has_kom`** — CLI `publish:edition-records`의 **`--has-kom <course_type>`** 또는 어드민 코스에서 켜짐(둘 중 하나로 반드시 확인)
- [ ] Blob **원본**·**정렬본** 업로드 및 에디션 URL 저장
- [ ] 홈 **최근 기록 업데이트** / **다가오는 대회** 구분이 기대와 같음
- [ ] 대회 상세: **연도별 참가자 추세**, **기록 분포**, **기록으로 찾기** (코스별)

관련: [로컬 개발 팁](./local-dev.md)
