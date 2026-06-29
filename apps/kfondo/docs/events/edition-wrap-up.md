# 6. 에디션·코스 마무리

[← 허브로](../ADD_EVENT.md)

- 에디션 **상태**: 대회 종료·기록 공개 후 `completed` 등으로 맞추면 홈 분류·문구에도 일관됩니다. (Blob만 있고 상태가 `upcoming`이어도 일부 UI는 보완되어 있으나, 운영상 맞춰 두는 것을 권장합니다.)
- 코스별 **접수 인원**은 실제 접수 집계에 맞게 `registered_count`에 반영합니다.
- **KOM**을 Blob에 올렸다면, 해당 코스 **`has_kom`**이 켜져 있는지 확인합니다(`publish:edition-records --has-kom …` 누락 시 UI에서 KOM이 막힐 수 있음 — [blob-publish.md](./blob-publish.md) KOM 절).

다음: [검증 체크리스트](./verify-checklist.md)
