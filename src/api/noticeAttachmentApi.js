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

// 첨부파일 "목록 조회"는 별도 API가 아니라 공지 상세 조회(GET /api/v1/notices/{noticeId})
// 응답에 attachments 필드로 함께 내려온다 (백엔드 팀 합의: 별도 GET 엔드포인트는 API 명세에
// 없어서 만들지 않고, 상세 응답에 붙이기로 함 — 2026-08-28). 그래서 이 파일엔 목록 조회 함수가
// 없고, 상세 조회 쪽(noticeApi.js의 getNoticeDetail)에서 data.attachments를 그대로 쓰면 된다.

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
