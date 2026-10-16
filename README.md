# for a month

28일, 벽에 걸린 달력 한 장을 버티는 카드 게임.

▶ **플레이: https://hsjun519.github.io/for-a-month/**

- PC 브라우저(크롬 · 엣지 · 파이어폭스) 권장. 첫 접속 때 약 90MB를 받습니다.
- 저장은 플레이하는 브라우저에 남습니다(다른 기기·브라우저와는 공유되지 않습니다).
- 조작: 마우스 · 전투 중 우클릭 전술 보기 · 탐색 WASD / 우클릭 시선.

이 저장소에는 웹으로 내보낸 게임 파일만 있습니다.
Made with Godot Engine 4.5.1 (MIT). Fonts: Noto Sans KR, Noto Sans Symbols 2, EB Garamond — SIL Open Font License 1.1 (OFL_*.txt).

## 로딩 최적화 (2026-10-14 도입 · 2026-10-16 v0.22로 갱신)

Godot 4.5.1 Release. 초기/후속 PCK 분리와 2026-10-14의 캐시 로더(asset-loader.js · assets-manifest.json)를 유지합니다.
초기 PCK 6.36MB(gzip 5.78MB), WASM gzip 9.24MB. 후속 자산 39.9MB는 타이틀 뒤 16MiB 구간 3개(gzip 39.5MB)로 받고,
SHA-256 검증 후 Cache Storage에 보관합니다. 재방문 시 바뀌지 않은 구간은 다시 받지 않습니다.
캐시 삭제·사생활 보호 모드·용량 부족이면 다시 받을 수 있습니다. 내보내기 후 `tools/web_release.py`로 이 구성을 다시 만듭니다.
