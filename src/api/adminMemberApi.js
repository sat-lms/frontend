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
