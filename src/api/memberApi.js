import axiosInstance from "./axiosInstance";

/**
 * 내 정보 조회
 * GET /api/v1/members/me
 * 앱 진입 시 localStorage의 accessToken이 아직 유효한지 검증하는 용도로도 사용한다.
 * @returns {Promise<{ id: number, studentNumber: string, name: string, role: string, status: string, createdAt: string }>}
 */
export const getMyInfo = async () => {
  const { data } = await axiosInstance.get("/api/v1/members/me");
  return data;
};
