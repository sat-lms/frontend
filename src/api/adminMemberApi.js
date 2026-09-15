import axiosInstance from "./axiosInstance";

/**
 * 회원 가입 신청 목록 조회 (관리자 전용)
 * GET /api/v1/admin/member-applications
 * status를 지정하지 않으면 백엔드가 PENDING을 신청일시 오름차순으로 내려준다.
 * @param {{ status?: "PENDING" | "APPROVED" | "REJECTED", page?: number, size?: number }} params
 * @returns {Promise<{ content: Array<{ memberId: number, studentNumber: string, name: string, status: string, createdAt: string }>, totalPages: number }>}
 */
export const getMemberApplications = async ({ status = "PENDING", page = 0, size = 20 } = {}) => {
  const { data } = await axiosInstance.get("/api/v1/admin/member-applications", {
    params: { status, page, size },
  });
  return data;
};

/**
 * 가입 신청 승인/거절 (관리자 전용)
 * PATCH /api/v1/admin/member-applications/{memberId}
 * action이 REJECTED이면 rejectionReason이 필수다.
 * @param {number|string} memberId
 * @param {{ action: "APPROVED" | "REJECTED", rejectionReason?: string }} payload
 * @returns {Promise<{ memberId: number, status: string, reviewerId: number, rejectionReason: string|null, reviewedAt: string }>}
 */
export const reviewMemberApplication = async (memberId, { action, rejectionReason }) => {
  const { data } = await axiosInstance.patch(`/api/v1/admin/member-applications/${memberId}`, {
    action,
    rejectionReason,
  });
  return data;
};

/**
 * 전체 회원 목록 조회 (관리자 전용)
 * GET /api/v1/admin/members
 * role/status/keyword는 모두 선택 필터이며, 넘기지 않으면 조건 없이 전체를 조회한다.
 * sort는 Spring Pageable 형식 문자열("createdAt,desc" 등).
 * @param {{ role?: "STUDENT" | "ADMIN", status?: "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN", keyword?: string, sort?: string, page?: number, size?: number }} params
 * @returns {Promise<{ content: Array<{ memberId: number, studentNumber: string, name: string, role: string, status: string, createdAt: string }>, totalPages: number, totalElements: number }>}
 */
export const getAllMembers = async ({ role, status, keyword, sort, page = 0, size = 20 } = {}) => {
  const { data } = await axiosInstance.get("/api/v1/admin/members", {
    params: { role, status, keyword, sort, page, size },
  });
  return data;
};

/**
 * 특정 회원 상세 조회 (관리자 전용) — member + 심사 기록(member_review)을 함께 내려준다.
 * GET /api/v1/admin/members/{memberId}
 * @param {number|string} memberId
 * @returns {Promise<{ memberId: number, studentNumber: string, name: string, role: string, status: string, createdAt: string, review?: { reviewerId: number, action: string, rejectionReason: string|null, reviewedAt: string } }>}
 */
export const getMemberDetail = async (memberId) => {
  const { data } = await axiosInstance.get(`/api/v1/admin/members/${memberId}`);
  return data;
};

/**
 * 회원 역할 변경 (관리자 전용)
 * PATCH /api/v1/admin/members/{memberId}/role
 * @param {number|string} memberId
 * @param {"STUDENT" | "ADMIN"} role
 * @returns {Promise<{ memberId: number, role: string, updatedAt: string }>}
 */
export const updateMemberRole = async (memberId, role) => {
  const { data } = await axiosInstance.patch(`/api/v1/admin/members/${memberId}/role`, { role });
  return data;
};

/**
 * 회원 추방 (강제 탈퇴, 관리자 전용)
 * DELETE /api/v1/admin/members/{memberId}
 * 물리 삭제가 아닌 소프트 삭제 — 상태만 WITHDRAWN으로 변경되고 연관 데이터는 보존된다.
 * 백엔드에서 APPROVED 상태의 STUDENT만 대상으로 허용하며, 자기 자신 및 다른 ADMIN은 차단한다.
 * @param {number|string} memberId
 * @returns {Promise<void>}
 */
export const expelMember = async (memberId) => {
  await axiosInstance.delete(`/api/v1/admin/members/${memberId}`);
};
