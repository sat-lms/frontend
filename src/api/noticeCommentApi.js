import axiosInstance from "./axiosInstance";

// 공지사항 댓글 API. GitHub PR #105(이슈 #104, "공지사항 댓글 기능 구현") 병합본 기준.
// 제출물 댓글(submissionCommentApi.js, 이슈 #96)과 같은 패턴으로 구현됐지만 권한이 더 느슨하다 —
// 공지는 전체 공개 게시물이라 로그인한 사람이면 학생/관리자 상관없이 누구나 댓글을 작성·조회할
// 수 있다(제출물 댓글은 "제출물 본인 또는 관리자"로 더 좁게 제한됨). 수정은 작성자 본인만,
// 삭제는 작성자 본인 또는 관리자만 — 이 부분은 제출물 댓글과 동일하다.
//
// ⚠️ 응답(NoticeCommentResponse)도 제출물 댓글과 마찬가지로 authorId가 없다 — authorName/
// authorRole만 내려온다. "내 댓글인지"는 이름 문자열 비교로만 판단 가능(동명이인 한계는
// submissionCommentApi.js 상단 주석과 동일).
export const NOTICE_COMMENT_MAX_LENGTH = 500;

/**
 * 공지 댓글 목록 조회 (로그인한 누구나)
 * GET /api/v1/notices/{noticeId}/comments
 * 오래된 순(createdAt asc)으로 내려온다.
 * @param {number|string} noticeId
 * @param {{ page?: number, size?: number }} [params]
 * @returns {Promise<{ content: Array<{ commentId: number, content: string, authorName: string, authorRole: string, createdAt: string }>, totalPages: number, totalElements: number }>}
 */
export const getNoticeComments = async (noticeId, { page = 0, size = 20 } = {}) => {
  const { data } = await axiosInstance.get(`/api/v1/notices/${noticeId}/comments`, {
    params: { page, size, sort: "createdAt,asc" },
  });
  return data;
};

/**
 * 공지 댓글 작성 (로그인한 누구나)
 * POST /api/v1/notices/{noticeId}/comments
 * @param {number|string} noticeId
 * @param {string} content - @NotBlank, 최대 500자
 */
export const createNoticeComment = async (noticeId, content) => {
  const { data } = await axiosInstance.post(`/api/v1/notices/${noticeId}/comments`, { content });
  return data;
};

/**
 * 공지 댓글 수정 (작성자 본인만)
 * PATCH /api/v1/notice-comments/{commentId}
 */
export const updateNoticeComment = async (commentId, content) => {
  const { data } = await axiosInstance.patch(`/api/v1/notice-comments/${commentId}`, { content });
  return data;
};

/**
 * 공지 댓글 삭제 (작성자 본인 또는 관리자)
 * DELETE /api/v1/notice-comments/{commentId}
 */
export const deleteNoticeComment = async (commentId) => {
  await axiosInstance.delete(`/api/v1/notice-comments/${commentId}`);
};
