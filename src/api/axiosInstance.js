import axios from "axios";

// .env 파일에 VITE_API_BASE_URL=http://localhost:8080 형태로 설정
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

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

// 백엔드 에러 응답을 프론트에서 다루기 쉬운 형태로 통일한다.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message ?? "알 수 없는 오류가 발생했습니다.";
    return Promise.reject({ status, message, raw: error });
  }
);

export default axiosInstance;
