import axiosInstance from "./axiosInstance";

/**
 * 과제별 전체 제출 현황 조회 (관리자 전용)
 * GET /api/v1/admin/assignments/{assignmentId}/submissions
 * status를 지정하지 않으면 전체 학생(제출/미제출 모두)을 학번순으로 내려준다.
 * @param {number|string} assignmentId
 * @param {{ status?: "SUBMITTED" | "NOT_SUBMITTED" | "LATE", page?: number, size?: number }} params
 * @returns {Promise<{
 *   submittedCount: number,
 *   notSubmittedCount: number,
 *   lateCount: number, // submittedCount의 부분집합 (제출 중 지각 제출 건수)
 *   students: { content: Array<{ submissionId: number|null, studentNumber: string, studentName: string, submittedAt: string|null, isLate: boolean }>, totalPages: number }
 * }>}
 */
export const getAssignmentSubmissionStatus = async (assignmentId, { status, page = 0, size = 20 } = {}) => {
  const { data } = await axiosInstance.get(`/api/v1/admin/assignments/${assignmentId}/submissions`, {
    params: { status, page, size },
  });
  return data;
};

/**
 * 특정 제출물 상세 조회 (관리자 전용)
 * GET /api/v1/admin/submissions/{submissionId}
 * @returns {Promise<{ submissionId: number, assignmentId: number, assignmentTitle: string, studentNumber: string, studentName: string, textContent: string, isLate: boolean, createdAt: string, updatedAt: string, files: Array<{ attachmentId: number, originalName: string, extension: string, sizeKb: number }> }>}
 */
export const getAdminSubmissionDetail = async (submissionId) => {
  const { data } = await axiosInstance.get(`/api/v1/admin/submissions/${submissionId}`);
  return data;
};
