# SAT-LMS API 명세서 대조 수정 패치

API 명세서(SATLMS_API_명세_수정본.pdf)와 실제 코드를 비교해 빠져 있던 API/화면을 추가하고,
발견된 버그를 고친 결과물입니다. 아래 경로 그대로 기존 저장소의 `src/` 밑에 덮어쓰면 됩니다.

## 새로 추가된 파일
- `src/pages/MyPage.jsx`, `src/pages/MyPage.css` — 마이페이지(정보 수정 / 비밀번호 변경 / 회원 탈퇴)
- `src/pages/AdminMembersPage.jsx`, `src/pages/AdminMembersPage.css` — 관리자 전체 회원 관리(목록/상세/역할 변경)

## 수정된 파일
- `src/api/memberApi.js` — `updateMyInfo`, `changeMyPassword`, `withdrawMe` 추가
- `src/api/adminMemberApi.js` — `getAllMembers`, `getMemberDetail`, `updateMemberRole` 추가
- `src/api/assignmentApi.js` — `deleteSubmission`(제출물 전체 삭제) 추가
- `src/utils/validators.js` — `getPasswordChangeErrors` 추가
- `src/context/AuthContext.jsx` — 로그인 응답(memberId)과 내 정보 조회 응답(id) 필드 불일치 정규화, `updateUser` 추가
- `src/pages/AssignmentDetailPage.jsx`, `src/pages/AssignmentDetailPage.css` — "제출물 전체 삭제" 버튼 연동
- `src/App.jsx` — `/mypage`, `/admin/members` 라우트 추가
- `src/components/Sidebar.jsx` — 마이페이지·회원 관리 메뉴 추가
- `src/components/Header.jsx`, `src/components/Header.css` — 프로필 영역을 마이페이지로 이동하는 링크로 변경

각 파일의 상세 변경 사유는 파일 내 주석에 남겨뒀습니다.
