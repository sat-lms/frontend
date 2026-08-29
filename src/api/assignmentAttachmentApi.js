import axiosInstance from "./axiosInstance";

// 과제 "참고 첨부파일"(관리자가 과제 등록/수정 시 미리 올려두는 안내 파일) API.
// 명세서 28/29/30번. 학생이 제출할 때 올리는 제출 첨부파일(submission-attachments)과는
// 별개의 개념/엔드포인트다 — 혼동 주의.
//
// 명세서에 공지 첨부파일(20번)처럼 "최대 N개/개별 용량/전체 용량" 숫자가 못 박혀 있지는
// 않고 "파일 정책을 검증한다"로만 적혀 있다. 공지·과제 첨부파일이 attachment 테이블을
// 공유하는 같은 성격의 파일이라 공지와 동일한 기준(최대 3개, 개별 20MB, 총 50MB)을
// 우선 맞춰뒀다 — 백엔드가 실제로 다른 값을 쓰면 여기 상수만 맞춰 바꾸면 된다.
export const ASSIGNMENT_FILE_MAX_COUNT = 3;
export const ASSIGNMENT_FILE_MAX_SIZE_BYTES = 20 * 1024 * 1024;
export const ASSIGNMENT_FILE_MAX_TOTAL_SIZE_BYTES = 50 * 1024 * 1024;
export const ASSIGNMENT_FILE_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.hwp,.hwpx,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip";

/**
 * 과제 참고 첨부파일 추가 (관리자 전용)
 * POST /api/v1/assignments/{assignmentId}/attachments (multipart/form-data)
 * 기존 첨부파일은 그대로 두고 새 파일을 "추가"한다.
 * @param {number|string} assignmentId
 * @param {File[]} files
 * @returns {Promise<Array<{ attachmentId: number, originalName: string, extension: string, sizeKb: number, formattedSize: string }>>}
 */
export const uploadAssignmentAttachments = async (assignmentId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const { data } = await axiosInstance.post(`/api/v1/assignments/${assignmentId}/attachments`, formData);
  return data;
};

// 첨부파일 "목록 조회"는 별도 API가 아니라 과제 상세 조회(GET /api/v1/assignments/{assignmentId})
// 응답의 attachments 필드로 함께 내려온다 (명세서 24번) — 공지와 동일한 구조.

/**
 * 과제 참고 첨부파일 다운로드 URL 발급
 * GET /api/v1/assignment-attachments/{attachmentId}/download-url
 * @returns {Promise<{ downloadUrl: string, expiresIn: number, originalName: string }>}
 */
export const getAssignmentAttachmentDownloadUrl = async (attachmentId) => {
  const { data } = await axiosInstance.get(`/api/v1/assignment-attachments/${attachmentId}/download-url`);
  return data;
};

/**
 * 과제 참고 첨부파일 삭제 (관리자 전용)
 * DELETE /api/v1/assignment-attachments/{attachmentId}
 */
export const deleteAssignmentAttachment = async (attachmentId) => {
  await axiosInstance.delete(`/api/v1/assignment-attachments/${attachmentId}`);
};
