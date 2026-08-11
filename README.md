# SAT-LMS Frontend (React + Vite)

## 폴더 구조

```
src/
  api/
    axiosInstance.js   # 공통 axios 인스턴스 (baseURL, 토큰 인터셉터, 에러 정규화)
    authApi.js          # signup / login / logout
  pages/
    SignupPage.jsx
    LoginPage.jsx
    AuthPage.css         # 두 페이지가 공유하는 스타일
  utils/
    validators.js        # API 명세서 필드 검증 규칙 (프론트 사전 검증용)
  components/             # 향후 공용 컴포넌트 (Button, Input 등) 배치 예정
  App.jsx                 # 라우팅 (/signup, /login)
```

## 실행 전 준비

1. `.env.example`을 `.env`로 복사하고 백엔드 주소를 맞춘다.
   ```
   VITE_API_BASE_URL=http://localhost:8080
   ```
2. 패키지 설치
   ```
   npm install axios react-router-dom
   ```

## 반영한 명세서 규칙

- **회원가입 (`POST /api/v1/auth/signup`)**
  - studentNumber: 숫자 8~10자리
  - name: 1~20자, 공백만 입력 불가
  - password: 8자 이상 + 영문/숫자 포함
  - passwordConfirm 일치 여부는 프론트에서 먼저 검증 (DB에는 저장 안 함)
  - 성공 시 로그인 페이지로 이동 + 승인 대기 안내 메시지 전달
  - 학번 중복(409) 시 필드 에러로 표시

- **로그인 (`POST /api/v1/auth/login`)**
  - 성공 시 `accessToken`, `memberId`, `role`을 localStorage에 저장
  - role이 ADMIN이면 `/admin`, STUDENT면 `/`로 분기 (현재는 임시 라우트)
  - PENDING / REJECTED / WITHDRAWN 상태별 안내 메시지 처리 (백엔드 응답 형태에 맞춰 `LoginPage.jsx`의 `STATUS_MESSAGE` 부분 조정 필요)

## 다음에 확인해야 할 것

- 백엔드가 로그인 실패 시 상태(PENDING 등)를 **어떤 필드명**으로 내려주는지 (`status`? `errorCode`?) — 지금은 추정으로 넣어뒀으니 실제 응답 보고 `LoginPage.jsx` 쪽 매핑만 고치면 됨
- accessToken 방식인지 세션(쿠키) 방식인지 백엔드와 확정 → `axiosInstance.js`의 `withCredentials` 값 조정
- 로그인 성공 후 이동할 실제 대시보드/공지 라우트는 아직 placeholder
