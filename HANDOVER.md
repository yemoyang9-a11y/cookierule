# Cookierule 인수인계 문서

2026년 9월 15일 기준. 새 대화창이나 Claude Code에서 이어서 작업할 때 이 파일과 `PLAN.md`부터 읽습니다. 제품 선정 근거와 공통 규약은 저장소 루트의 `IDEA_BRIEF.md`(운영자가 넣어 둠) 4.A절입니다.

## 1. 이 프로젝트가 뭔가

쿠키는 웹사이트가 "당신이 누구인지"를 기억하려고 브라우저에 남기는 작은 쪽지입니다. Cookierule은 현재 사이트의 그 쪽지들을 보고, 고치고, 지우고, 파일로 저장했다가 되돌리는 크롬·엣지·파이어폭스 확장입니다. 2024년 EditThisCookie가 매각 뒤 퇴출됐고, 현재 1등 Cookie-Editor는 소스가 비공개라 "안전한지 모르겠다"는 불만이 있습니다. Cookierule은 소스 공개, 네트워크 호출 없음, 보호 목록, 로그인 상태 프로필(Pro)로 그 자리를 노립니다. Headrule과 같은 고객층이라 번들($15)로 팝니다.

## 2. 폴더 구조

| 경로 | 내용 |
|---|---|
| `extension/` | 확장 본체. 빌드 없이 그대로 로드됨 |
| `extension/lib/cookies.js` | 쿠키 API 래퍼. Chrome/Firefox 차이 처리 |
| `extension/lib/formats.js` | 가져오기·내보내기 파서. 브라우저 API 안 씀(node 테스트 가능) |
| `extension/lib/storage.js` | 보호 목록, 프로필, 설정, 라이선스 저장 |
| `extension/lib/license.js` | Headrule에서 복사. 두 저장소가 같이 바뀌어야 함 |
| `extension/lib/config.js` | 구매 링크, 지원 메일, Lemon Squeezy ID |
| `extension/popup/` | 툴바 아이콘 화면 |
| `extension/options/` | 라이선스, 권한, 보호 목록 |
| `scripts/build.mjs` | `dist/`에 chrome·edge·firefox zip 세 개 생성 |
| `scripts/check_network.mjs` | license.js 밖에서 fetch를 쓰면 실패 |
| `test/` | `*.test.mjs` 단위 테스트, `smoke.mjs` Playwright e2e |

명령어: `npm test`, `npm run lint:network`, `npm run build`, `npm run test:e2e`(로컬에서 `npm i && npx playwright install chromium` 먼저).

## 3. 어디까지 했나

`PLAN.md` "현재 상태" 참고. 코드는 문법 검사와 단위 테스트만 통과했고 실제 브라우저 실행은 아직입니다.

## 4. 사람이 직접 해야 하는 일

1. **activeTab 확인**(가장 먼저). `chrome://extensions` → 개발자 모드 → "압축해제된 확장 프로그램 로드" → `extension/` 선택 → 아무 https 사이트에서 아이콘 클릭. 쿠키 목록이 보이면 통과. "needs permission" 안내가 뜨면 activeTab이 쿠키 API를 못 덮는 것이니 그 결과를 PLAN.md에 적고 알려 주세요.
2. 최종 이름 결정. 작업명은 Cookierule. 웹스토어·도메인 중복 확인 필요.
3. Lemon Squeezy에 Cookierule Pro($9)와 Headrule+Cookierule 번들($15) 상품 생성 후 store ID·product ID를 `extension/lib/config.js`에 기입. 번들은 라이선스 키 하나로 두 확장을 여는 방식이 가장 단순한데, 그러려면 두 확장의 `ownershipOk`가 번들 product ID도 허용해야 합니다(3주차에 처리).
4. GitHub에 공개 저장소 `cookierule` 생성 후 이 폴더 push. GitHub Pages 켜기(`site/`가 생기는 4주차).
5. 스토어 제출 클릭(Chrome, Edge 파트너 센터, Firefox AMO). 절차는 Headrule의 HANDOVER.md와 같고, Chrome은 `cookies` 권한 사유를 설명란에 한 문단 적어야 합니다.

## 5. 설계상 알아 둘 것

- 권한: 기본은 현재 탭만(`activeTab`). "모든 사이트"는 사용자가 옵션에서 켜는 선택 권한. 심사 속도와 신뢰 둘 다를 위한 결정.
- 쿠키 이름·도메인·경로를 바꾸는 편집은 "옛 쿠키 삭제 + 새 쿠키 생성"으로 처리.
- 보호 목록 키는 `이름|도메인|경로`.
- Netscape 내보내기만 Pro. JSON 가져오기·내보내기는 무료(데이터를 못 빼가게 막지 않는다는 원칙).
- Firefox zip은 `background.scripts`와 gecko id(`cookierule@headrule.com`)를 넣어 따로 만듦. id는 도메인 소유와 무관하게 쓸 수 있지만 바꾸려면 첫 제출 전에.

## 6. 다음 할 일

`PLAN.md` 1주차의 미완료 항목부터.
