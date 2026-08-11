import axiosInstance from "./axiosInstance";

/**
 * 공지 목록 조회
 * GET /api/v1/notices
 * 서버가 (is_pinned desc, created_at desc)로 정렬해서 내려준다.
 * @param {{ page?: number, size?: number, unreadOnly?: boolean }} params
 * @returns {Promise<{ content: Array<{ noticeId: number, title: string, isPinned: boolean, createdAt: string, authorName: string, isRead: boolean }>, totalPages: number, totalElements: number, number: number }>}
 */
export const getNotices = async (params = {}) => {
  const { data } = await axiosInstance.get("/api/v1/notices", { params });
  return data;
};

/**
 * 공지 상세 조회 (읽음 처리 부수 효과 포함)
 * GET /api/v1/notices/{noticeId}
 * @param {number|string} noticeId
 * @returns {Promise<{ noticeId: number, title: string, content: string, authorName: string, createdAt: string, attachments: Array }>}
 */
export const getNoticeDetail = async (noticeId) => {
  const { data } = await axiosInstance.get(`/api/v1/notices/${noticeId}`);
  return data;
};

/**
 * 안 읽은 공지 개수 조회
 * GET /api/v1/notices/unread-count
 * @returns {Promise<{ unreadCount: number }>}
 */
export const getUnreadNoticeCount = async () => {
  const { data } = await axiosInstance.get("/api/v1/notices/unread-count");
  return data;
};
