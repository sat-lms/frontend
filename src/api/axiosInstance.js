import axios from "axios";

// 프로덕션(Vercel) 빌드에서는 baseURL을 비워서 상대경로("/api/v1/...")로 요청한다.
// vercel.json의 rewrites가 "/api/:path*"를 백엔드(https://satlms.cloud)로 서버 사이드 프록시하므로
// 브라우저는 같은 오리진(satlms.vercel.app)으로만 요청 → 백엔드 CORS 설정 없이 동작한다.
// 로컬 개발(npm run dev)에서는 프록시가 없으므로 .env의 VITE_API_BASE_URL로 백엔드를 직접 호출한다.
const BASE_URL = import.meta.env.PROD
  ? ""
  : import.meta.env.VITE_API_BASE_URL ?? "https://satlms.cloud";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  // JWT(Access Token) 단독 방식으로 확정 — 쿠키 세션을 안 쓰므로 withCredentials 불필요
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === "object" && "success" in body && "data" in body) {
      response.data = body.data;
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message ?? "알 수 없는 오류가 발생했습니다.";
    return Promise.reject({ status, message, raw: error });
  }
);

export default axiosInstance;