import axios from "axios";

// 항상 같은 오리진의 상대경로("/api/v1/...")로 요청한다.
// - 프로덕션(Vercel): vercel.json rewrites가 "/api/:path*"를 https://api.satlms.cloud 로 서버 사이드 프록시
// - 로컬 개발(npm run dev): vite.config.js의 server.proxy가 "/api"를 https://api.satlms.cloud 로 프록시
// 브라우저 입장에서는 항상 같은 오리진이라 CORS 설정 없이 동작한다.
const BASE_URL = "";

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