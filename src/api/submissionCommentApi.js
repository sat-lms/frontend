import axiosInstance from "./axiosInstance";

// 제출물 댓글(피드백) API. GitHub PR #100(이슈 #96, "제출물 댓글(피드백) 기능 구현") 병합본 기준으로
// 실제 백엔드 코드(diff)를 직접 확인해서 맞췄다 — 명세서 PDF에는 아직 반영 안 돼 있을 수 있으니
// 나중에 명세서가 갱신되면 이 파일과 대조해서 어긋나는 부분 없는지 한 번 더 확인할 것.
//
// ⚠️ 댓글은 "제출물" 단위로만 존재한다 — 공지/과제 자체에는 댓글 기능이 없다. 팀 논의에서도
// 학생이 과제를 제출하기 전 화면(아직 submission이 없는 상태)에는 댓글 섹션을 넣지 않기로
// 했으므로, 이 API는 반드시 submission이 이미 존재하는 화면(제출 완료 후 상세, 관리자 제출물
// 상세 모달)에서만 호출해야 한다.
//
// ⚠️ 응답(SubmissionCommentResponse)에는 authorId가 없다 — authorName/authorRole만 내려온다.
// 그래서 프론트에서 "이 댓글이 내가 쓴 게 맞는지"는 이름 문자열 비교(authorName === 내 이름)로만
// 판단할 수 있다. 동명이인이 있으면 서로의 댓글을 자기 것으로 착각해 수정 버튼이 잘못 노출될 수
// 있다는 한계가 있음 — 백엔드가 authorId를 내려주기 시작하면 이 비교를 id 기반으로 바꿔야 한다.
export const SUBMISSION_COMMENT_MAX_LENGTH = 500;

/**
 * 제출물 댓글 목록 조회 (제출물 본인 또는 ADMIN)
 * GET /api/v1/submissions/{submissionId}/comments
 * 오래된 순(createdAt asc)으로 내려온다.
 * @param {number|string} submissionId
 * @param {{ page?: number, size?: number }} [params]
 * @returns {Promise<{ content: Array<{ commentId: number, content: string, authorName: string, authorRole: string, createdAt: string }>, totalPages: number, totalElements: number }>}
 */
export const getSubmissionComments = async (submissionId, { page = 0, size = 20 } = {}) => {
  const { data } = await axiosInstance.get(`/api/v1/submissions/${submissionId}/comments`, {
    params: { page, size, sort: "createdAt,asc" },
  });
  return data;
};

/**
 * 제출물 댓글 작성 (제출물 본인 또는 ADMIN)
 * POST /api/v1/submissions/{submissionId}/comments
 * @param {number|string} submissionId
 * @param {string} content - @NotBlank, 최대 500자
 */
export const createSubmissionComment = async (submissionId, content) => {
  const { data } = await axiosInstance.post(`/api/v1/submissions/${submissionId}/comments`, { content });
  return data;
};

/**
 * 제출물 댓글 수정 (작성자 본인만)
 * PATCH /api/v1/submission-comments/{commentId}
 */
export const updateSubmissionComment = async (commentId, content) => {
  const { data } = await axiosInstance.patch(`/api/v1/submission-comments/${commentId}`, { content });
  return data;
};

/**
 * 제출물 댓글 삭제 (작성자 본인 또는 ADMIN)
 * DELETE /api/v1/submission-comments/{commentId}
 */
export const deleteSubmissionComment = async (commentId) => {
  await axiosInstance.delete(`/api/v1/submission-comments/${commentId}`);
};
