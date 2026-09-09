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

/**
 * 계정 복구 신청 (자진 탈퇴 회원 전용). GitHub PR #107(이슈 #106) 기준.
 * POST /api/v1/auth/reactivation-requests
 *
 * 신청이 접수되면 회원 status가 PENDING으로 바뀌고, 관리자가 회원가입 승인과 완전히 동일한
 * 화면/API(PATCH /api/v1/admin/member-applications/{memberId})에서 승인·거절한다 — 그래서
 * 이 화면(AdminApprovalsPage)에는 신규 가입 신청과 복구 신청이 구분 없이 섞여서 뜬다.
 *
 * ⚠️ 로그인이 아니라 "본인 확인" 목적이라 currentPassword가 실제 형식 검증(8자+영문+숫자)
 * 대상이 아니다 — 백엔드는 @NotBlank + 72바이트 이하만 검증한다(가입 당시 규칙이 달랐어도
 * 기존 비밀번호를 그대로 받아야 하므로).
 *
 * ⚠️ 인증 실패 사유(회원 없음/비밀번호 불일치/자진탈퇴 아님/관리자 추방됨)를 401
 * "계정 복구 정보를 확인할 수 없습니다."로 전부 뭉뚱그려 내려준다 — 어떤 학번이 가입돼
 * 있는지, 탈퇴 사유가 뭔지 외부에 노출하지 않으려는 의도로 보인다. 프론트도 이 메시지를
 * 그대로 보여주고 더 구체적으로 추측해서 알려주지 않는다.
 * @param {{ studentNumber: string, currentPassword: string, passwordConfirm: string }} payload
 */
export const requestReactivation = async ({ studentNumber, currentPassword, passwordConfirm }) => {
  const { data } = await axiosInstance.post("/api/v1/auth/reactivation-requests", {
    studentNumber,
    currentPassword,
    passwordConfirm,
  });
  return data;
};
