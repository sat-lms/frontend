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

/**
 * 내 정보 수정 (이름만 변경 가능 — 학번/role/status는 이 API로 수정하지 않는다)
 * PATCH /api/v1/members/me
 * @param {{ name: string }} payload
 * @returns {Promise<{ id: number, studentNumber: string, name: string, role: string, status: string, updatedAt: string }>}
 */
export const updateMyInfo = async ({ name }) => {
  const { data } = await axiosInstance.patch("/api/v1/members/me", { name });
  return data;
};

/**
 * 내 비밀번호 변경
 * PATCH /api/v1/members/me/password
 * 현재 비밀번호의 실제 일치 여부는 백엔드(PasswordEncoder.matches())에서만 검증할 수 있으므로,
 * 프론트는 형식 검증(getPasswordChangeErrors)만 미리 하고 최종 판단은 이 요청의 결과로 받는다.
 * @param {{ currentPassword: string, newPassword: string, newPasswordConfirm: string }} payload
 */
export const changeMyPassword = async ({ currentPassword, newPassword, newPasswordConfirm }) => {
  const { data } = await axiosInstance.patch("/api/v1/members/me/password", {
    currentPassword,
    newPassword,
    newPasswordConfirm,
  });
  return data;
};

/**
 * 회원 탈퇴 — 물리 삭제가 아니라 member.status를 WITHDRAWN으로 변경한다 (제출 기록은 유지).
 * DELETE /api/v1/members/me
 * axios는 DELETE에 바디를 실으려면 config.data로 넘겨야 한다.
 * @param {{ password: string }} payload
 */
export const withdrawMe = async ({ password }) => {
  const { data } = await axiosInstance.delete("/api/v1/members/me", { data: { password } });
  return data;
};
