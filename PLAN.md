# Cookierule 작업 계획

IDEA_BRIEF.md 4.A절 기준. 주 10시간. 완료한 항목은 [x]로 바꾸고, 세션이 끝날 때마다 "현재 상태"를 갱신합니다.

## 현재 상태 (2026-09-15)

1주차 골격이 나왔습니다. 저장소 구조, 세 브라우저 매니페스트, 팝업(목록·검색·추가·수정·삭제·보호·전체삭제·가져오기·내보내기), 옵션(라이선스·권한·보호 목록), 형식 파서 단위 테스트 6개 통과, 네트워크 호출 lint, 빌드 스크립트. 실제 브라우저에서는 아직 한 번도 안 돌렸습니다. 1주차 첫 항목(activeTab 확인)이 첫 번째 할 일입니다.

## 구조 결정

IDEA_BRIEF 2.1절은 TypeScript + Vite + WXT를 권하지만, Headrule이 번들러 없는 순수 ES 모듈로 이미 검증됐고 "Headrule 구조를 그대로 복제"가 우선이라 같은 방식으로 갔습니다. 빌드 단계가 없어서 심사 때 소스와 제출물이 1:1이고 "코드를 직접 읽어 보라"는 판매 문구와도 맞습니다. Firefox 차이는 `scripts/build.mjs`가 매니페스트만 바꿔 별도 zip을 만듭니다. 운영자가 TypeScript로 바꾸고 싶으면 2주차 전에 결정합니다. 나중에 바꾸면 비용이 커집니다.

## 1주차: 골격과 기본 편집

- [x] 저장소 생성, Headrule 구조 복제, 라이선스 모듈 재사용
- [x] 매니페스트: `cookies`, `storage`, `activeTab`, `alarms` + 선택 `<all_urls>`
- [x] 팝업: 현재 사이트 쿠키 목록, 검색, 추가·수정·삭제, 값 복사, 플래그 표시(Secure/HttpOnly/SameSite/Partitioned)
- [x] 보호 목록과 "보호 제외 전체 삭제"
- [x] 가져오기·내보내기 3형식(Cookie-Editor JSON, EditThisCookie JSON, Netscape) + 단위 테스트
- [x] 네트워크 호출 lint, 세 브라우저 빌드 스크립트
- [ ] **activeTab만으로 현재 사이트 쿠키를 읽을 수 있는지 실제 확인** (수동: 압축 해제 로드 → https 사이트 → 아이콘 클릭 → 목록이 뜨는지). 안 되면 팝업의 "Allow all sites" 안내가 자동으로 뜨도록 이미 처리돼 있으니, 그 경우 첫 실행 온보딩 문구를 다듬고 스토어 설명에 이유를 적음
- [ ] Playwright e2e 실행(`npm i && npx playwright install chromium && npm run test:e2e`)
- [ ] 수정 폼에서 만료일 시간대 처리 확인, SameSite=None+Secure 검증 확인

## 2주차: 마무리와 Firefox

- [ ] Firefox에서 `firstPartyDomain`/`partitionKey` 동작 확인(about:debugging로 임시 로드)
- [ ] CHIPS 파티션 쿠키 표시 확인(Chrome)
- [ ] 큰 사이트(쿠키 50개 이상)에서 팝업 성능
- [ ] 키보드 단축키(Ctrl+F 검색은 완료, 나머지)
- [ ] 다크 모드 점검(Headrule CSS 상속)
- [ ] e2e: 가져오기 → 같은 사이트 복원 → 쿠키 동일 확인

## 3주차: Pro

- [ ] 프로필: 현재 사이트 쿠키 세트를 이름 붙여 저장, 복원, 교체(기존 삭제 후 복원)
- [ ] `chrome.storage.sync` 분할 저장(항목 8KB, 총 100KB)
- [ ] 전 사이트 일괄 규칙(선택 권한 있을 때만 노출)
- [ ] 라이선스 게이트 e2e: 키 없으면 잠김 + 안내, 키 있으면 열림
- [ ] Lemon Squeezy 상품 ID를 `lib/config.js`에 반영(운영자 작업 후)

## 4주차: 자산과 제출 준비

- [ ] `_locales` 문자열 분리(팝업·옵션 텍스트를 messages.json으로), en → ko, ja, de, es
- [ ] 스크린샷 5장(1280x800), 홍보 타일, 스토어 설명(`store/listing.md`)
- [ ] 랜딩 `site/index.html`, `privacy.html`, 하위 페이지 `/editthiscookie-alternative`, `/cookie-editor-alternative`
- [ ] `HANDOVER.md` 제출 절차 최종화
- [ ] 3주차 끝나는 즉시 Chrome 제출(`cookies` 권한 때문에 1~3주)

## 5주차: 제출과 대기

- [ ] 운영자: Chrome, Edge, Firefox 제출 클릭
- [ ] 대기 중: 번역, Headrule 번들 상품 생성 안내, 커뮤니티 답글 초안
