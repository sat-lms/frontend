import axios from "axios";

// 프로덕션(Vercel) 빌드에서는 baseURL을 비워서 상대경로("/api/v1/...")로 요청한다.
// Vercel이 HTTPS로 서빙되는데 백엔드(43.202.220.10:8080)는 아직 HTTP만 지원해서, 브라우저가
// 직접 호출하면 Mixed Content로 차단된다. 그래서 vercel.json의 rewrites로 "/api/:path*"를
// 백엔드로 서버 사이드 프록시하고, 프론트는 같은 오리진(satlms.vercel.app)으로만 요청을 보낸다.
// 로컬 개발(npm run dev)에서는 이 프록시가 없으므로 .env의 VITE_API_BASE_URL(또는 기본값
// localhost:8080)로 백엔드를 직접 호출한다.
const BASE_URL = import.meta.env.PROD
  ? ""
  : import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  // JWT(Access Token) 단독 방식으로 확정 — 쿠키 세션을 안 쓰므로 withCredentials 불필요
});

// 로그인 후 저장된 accessToken을 매 요청에 자동으로 실어 보낸다.
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 백엔드가 모든 성공 응답을 { success, message, data } 형태(ApiResponse<T>)로 감싸서 내려준다.
// 각 api/*.js 파일은 실제 페이로드(data 안쪽)만 다루도록 짜여있으므로, 여기서 한 번에 풀어준다.
axiosInstance.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === "object" && "success" in body && "data" in body) {
      response.data = body.data;
    }
    return response;
  },
  (error) => {
    // 에러 응답도 같은 ApiResponse 포맷(success:false, message, data:null)으로 오므로
    // message는 그대로 error.response.data.message에서 꺼내 쓸 수 있다.
    const status = error.response?.status;
    const message = error.response?.data?.message ?? "알 수 없는 오류가 발생했습니다.";
    return Promise.reject({ status, message, raw: error });
  }
);

export default axiosInstance;
