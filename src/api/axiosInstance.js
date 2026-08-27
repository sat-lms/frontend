import axios from "axios";

// .env 파일의 VITE_API_BASE_URL로 백엔드 주소를 설정한다.
// 로컬에서 백엔드를 직접 띄우지 않는 이상 localhost:8080이 아니라 실제 배포 주소를 넣어야 한다
// (2026-08-27 기준 http://43.202.220.10:8080).
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
