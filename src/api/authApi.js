import axiosInstance from "./axiosInstance";

/**
 * 회원가입 신청
 * POST /api/v1/auth/signup
 * @param {{ studentNumber: string, name: string, password: string, passwordConfirm: string }} payload
 * @returns {Promise<{ memberId: number, studentNumber: string, name: string, status: string, createdAt: string }>}
 */
export const signup = async (payload) => {
  const { data } = await axiosInstance.post("/api/v1/auth/signup", payload);
  return data;
};

/**
 * 로그인
 * POST /api/v1/auth/login
 * @param {{ studentNumber: string, password: string }} payload
 * @returns {Promise<{ accessToken: string, memberId: number, name: string, role: string, status: string }>}
 */
export const login = async (payload) => {
  const { data } = await axiosInstance.post("/api/v1/auth/login", payload);
  return data;
};

/**
 * 로그아웃
 * POST /api/v1/auth/logout
 */
export const logout = async () => {
  const { data } = await axiosInstance.post("/api/v1/auth/logout");
  return data;
};
