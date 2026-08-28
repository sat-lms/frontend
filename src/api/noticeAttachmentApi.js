import axiosInstance from "./axiosInstance";

// 백엔드 NoticeAttachmentService의 파일 검증 기준과 동일하게 맞춘 클라이언트측 사전 체크용 상수.
export const NOTICE_FILE_MAX_COUNT = 3;
export const NOTICE_FILE_MAX_SIZE_BYTES = 20 * 1024 * 1024;
export const NOTICE_FILE_MAX_TOTAL_SIZE_BYTES = 50 * 1024 * 1024;
export const NOTICE_FILE_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.hwp,.hwpx,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip";

/**
 * 공지 첨부파일 추가 (관리자 전용)
 * POST /api/v1/notices/{noticeId}/attachments (multipart/form-data)
 * 기존 첨부파일은 그대로 두고 새 파일을 "추가"한다 (과제 제출과 달리 통째로 교체하지 않음).
 * 공지 하나에 최대 3개, 개당 20MB, 전체 50MB까지.
 * @param {number|string} noticeId
 * @param {File[]} files
 * @returns {Promise<Array<{ attachmentId: number, originalName: string, extension: string, sizeKb: number, formattedSize: string }>>}
 */
export const uploadNoticeAttachments = async (noticeId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const { data } = await axiosInstance.post(`/api/v1/notices/${noticeId}/attachments`, formData);
  return data;
};

/**
 * 공지 첨부파일 목록 조회
 * GET /api/v1/notices/{noticeId}/attachments
 *
 * ⚠️ 이 글 작성 시점 기준으로 백엔드에 이 엔드포인트가 아직 없다(업로드/다운로드URL발급/삭제만
 * 구현돼 있고, 목록 조회 API가 빠져 있음 — repository의 findWithAttachmentByNoticeId는 이미
 * 있으니 컨트롤러만 추가하면 됨). 그래서 404가 나면 "첨부파일 없음"으로 조용히 처리한다 —
 * 나중에 백엔드가 이 엔드포인트를 추가하면 프론트 수정 없이 바로 동작한다.
 * @param {number|string} noticeId
 * @returns {Promise<Array<{ attachmentId: number, originalName: string, extension: string, sizeKb: number, formattedSize: string }>>}
 */
export const getNoticeAttachments = async (noticeId) => {
  try {
    const { data } = await axiosInstance.get(`/api/v1/notices/${noticeId}/attachments`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.status === 404) return [];
    throw err;
  }
};

/**
 * 공지 첨부파일 다운로드 URL 발급
 * GET /api/v1/notice-attachments/{attachmentId}/download-url
 * @returns {Promise<{ downloadUrl: string, expiresIn: number, originalName: string }>}
 */
export const getNoticeAttachmentDownloadUrl = async (attachmentId) => {
  const { data } = await axiosInstance.get(`/api/v1/notice-attachments/${attachmentId}/download-url`);
  return data;
};

/**
 * 공지 첨부파일 삭제 (관리자 전용)
 * DELETE /api/v1/notice-attachments/{attachmentId}
 */
export const deleteNoticeAttachment = async (attachmentId) => {
  await axiosInstance.delete(`/api/v1/notice-attachments/${attachmentId}`);
};
