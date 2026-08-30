# SAT-LMS Frontend (React + Vite)

명지대 소프트웨어 아카데미(SAT) 과제 업로드 및 공지 사이트의 프론트엔드입니다. 학생은 공지사항/과제를 확인하고 과제를 제출하며, 관리자는 공지·과제를 등록하고 회원가입 승인, 회원 관리, 제출 현황을 관리합니다.

## 기술 스택

- React 19 + Vite (Rolldown 기반 Vite 8)
- react-router-dom 7 (BrowserRouter)
- axios (공통 인스턴스 + 인터셉터)
- 순수 CSS (프레임워크 없이 디자인 토큰 기반 커스텀 스타일)

## 폴더 구조

```
src/
  api/
    axiosInstance.js         # 공통 axios 인스턴스 (baseURL, 토큰 인터셉터, 에러 정규화)
    authApi.js                # 회원가입 / 로그인 / 로그아웃
    memberApi.js               # 내 정보 조회/수정, 비밀번호 변경, 회원 탈퇴
    adminMemberApi.js          # 관리자 - 전체 회원 조회/상세/권한 변경
    noticeApi.js                # 공지사항 CRUD
    noticeAttachmentApi.js      # 공지 첨부파일 업로드/다운로드(S3 presigned URL)
    assignmentApi.js            # 과제 CRUD, 제출/재제출/제출물 삭제
    assignmentAttachmentApi.js  # 과제 첨부파일 업로드/다운로드
    adminSubmissionApi.js       # 관리자 - 과제 제출 현황 조회

  context/
    AuthContext.jsx           # 로그인 상태(user, accessToken) 전역 관리, login/logout/updateUser

  components/
    AppLayout.jsx / .css       # 헤더 + 사이드바 + 콘텐츠를 감싸는 공통 레이아웃
    Header.jsx / .css          # 상단 헤더 (햄버거 버튼, 로고, 내 정보, 로그아웃)
    Sidebar.jsx / .css         # 좌측 메뉴 (햄버거 클릭 시 열리는 슬라이드 드로어)
    BrandPanel.jsx / .css      # 로그인/회원가입 화면 좌측 브랜딩 패널
    ProtectedRoute.jsx         # 로그인/권한(role) 여부에 따라 접근 제어하는 라우트 가드

  pages/
    LoginPage.jsx / SignupPage.jsx / AuthPage.css
    DashboardPage.jsx / .css          # 로그인 후 홈
    NoticeListPage.jsx / NoticeDetailPage.jsx / NoticeWritePage.jsx
    AssignmentListPage.jsx / AssignmentDetailPage.jsx / AssignmentWritePage.jsx
    MyPage.jsx / .css                  # 마이페이지 (내 정보 수정, 비밀번호 변경, 회원 탈퇴)
    AdminApprovalsPage.jsx / .css      # 관리자 - 회원가입 승인
    AdminMembersPage.jsx / .css        # 관리자 - 전체 회원 관리(권한 변경)
    AdminSubmissionsPage.jsx / .css    # 관리자 - 과제 제출 현황
    AdminWritePage.css                 # 공지/과제 작성 화면 공유 스타일

  utils/
    validators.js              # API 명세서 필드 검증 규칙 (프론트 사전 검증용)

  App.jsx                      # 라우팅 전체 정의
  main.jsx / index.css
```

## 실행 방법

1. 패키지 설치
   ```
   npm install
   ```
2. `.env` 파일에 백엔드 주소 설정
   ```
   VITE_API_BASE_URL=http://<백엔드-서버-주소>:8080
   ```
3. 개발 서버 실행
   ```
   npm run dev
   ```
4. 빌드 / 미리보기
   ```
   npm run build
   npm run preview
   ```
5. lint
   ```
   npm run lint
   ```

## 인증 흐름

- JWT accessToken 방식. 로그인 성공 시 `accessToken`, `memberId`, `role`을 `localStorage`에 저장하고 `AuthContext`가 전역 상태로 관리합니다.
- `axiosInstance.js`가 요청마다 저장된 토큰을 헤더에 실어 보내고, 응답은 `ApiResponse<T>` 래퍼(`{ success, message, data }`)를 벗겨서 돌려주며 에러를 `{ status, message, raw }` 형태로 정규화합니다.
- 로그인 응답의 `memberId`와 `GET /members/me`의 `id`가 서로 다른 필드명이라, `AuthContext.login()`에서 `id: userInfo.id ?? userInfo.memberId`로 정규화해 어느 경로로 로그인 상태가 만들어지든 `user.id`를 일관되게 사용할 수 있게 했습니다.
- `ProtectedRoute`가 로그인 여부와 `role`(ADMIN/STUDENT)에 따라 페이지 접근을 제어합니다.

## 라우트 구성

| 경로 | 화면 | 접근 |
|---|---|---|
| `/signup`, `/login` | 회원가입 / 로그인 | 비로그인 |
| `/` | 대시보드 | 로그인 사용자 |
| `/mypage` | 마이페이지 | 로그인 사용자 |
| `/notices`, `/notices/:noticeId` | 공지 목록 / 상세 | 로그인 사용자 |
| `/assignments`, `/assignments/:assignmentId` | 과제 목록 / 상세(제출) | 로그인 사용자 |
| `/admin/approvals` | 회원가입 승인 | ADMIN |
| `/admin/members` | 회원 관리 | ADMIN |
| `/admin/submissions` | 과제 제출 현황 | ADMIN |
| `/admin/notices/new`, `/admin/notices/:noticeId/edit` | 공지 작성/수정 | ADMIN |
| `/admin/assignments/new`, `/admin/assignments/:assignmentId/edit` | 과제 등록/수정 | ADMIN |

## 사이드바 UX

평소에는 사이드바가 화면 밖에 숨어 있다가, 헤더 좌측 햄버거 버튼을 누르면 드로어(slide-in)로 펼쳐집니다. 배경(backdrop) 클릭, 메뉴 항목 선택, `Esc` 키 중 어떤 방식으로도 닫히며, PC/모바일에 동일하게 적용됩니다.

## 파일 첨부 (공지/과제)

- 첨부파일은 presigned URL 방식으로 처리합니다: 업로드는 `request`(JSON Blob) + `files` 파트로 구성된 multipart/form-data 요청으로, 다운로드는 백엔드에서 발급받은 S3 presigned URL로 진행합니다.

## API 명세서 대조 현황

`SATLMS_API_명세_수정본.pdf`(39개 엔드포인트) 기준으로 프론트 코드를 전수 대조했고, 아래 항목을 추가로 구현해 반영했습니다.

- `memberApi.js`: 내 정보 수정, 비밀번호 변경, 회원 탈퇴
- `adminMemberApi.js`: 전체 회원 조회, 회원 상세 조회, 권한 변경
- `assignmentApi.js`: 제출물 전체 삭제 (`deleteSubmission`) — 기존 코드에 주석으로만 언급되고 실제 구현이 빠져 있던 부분
- 화면: 마이페이지(`MyPage`), 관리자 회원 관리(`AdminMembersPage`) 신규 추가
- 사이드바를 항상 펼쳐진 형태에서 햄버거 버튼 + 슬라이드 드로어 방식으로 전환

## 다음에 확인해야 할 것

- 로그인 실패 시 상태(PENDING/REJECTED/WITHDRAWN 등)를 백엔드가 어떤 필드명으로 내려주는지 실제 응답 기준으로 `LoginPage.jsx`의 상태 메시지 매핑 재확인
- 배포 시 `.env`의 `VITE_API_BASE_URL`을 운영 서버 주소로 교체 (현재 `vercel.json` 기준 Vercel 배포)