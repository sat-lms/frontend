import axiosInstance from "./axiosInstance";

/**
 * 과제 목록 조회
 * GET /api/v1/assignments
 * 백엔드 AssignmentListResponse에는 마감일시(dueAt)/지각허용여부(allowLateSubmission)만 있고
 * "내 제출 상태"는 내려주지 않는다 (N+1을 피하려면 getMySubmissions와 조합해서 클라이언트에서 계산해야 함).
 * @param {{ page?: number, size?: number }} params
 * @returns {Promise<{ content: Array<{ assignmentId: number, title: string, dueAt: string, allowLateSubmission: boolean }>, totalPages: number }>}
 */
export const getAssignments = async (params = {}) => {
  const { data } = await axiosInstance.get("/api/v1/assignments", { params });
  return data;
};

/**
 * 과제 상세 조회
 * GET /api/v1/assignments/{assignmentId}
 * 명세서 24번: 응답에 관리자가 미리 올려둔 "참고 첨부파일" 목록도 attachments 필드로 함께
 * 내려온다 (공지 상세 조회와 동일한 패턴 — 별도 목록 조회 API는 없다).
 * 학생이 과제를 제출할 때 함께 올리는 제출 첨부파일(submission-attachments)과는 다른
 * 개념이니 혼동하지 말 것 — 그건 getMySubmission()의 files로 따로 내려온다.
 * @returns {Promise<{ assignmentId: number, title: string, content: string, dueAt: string, allowLateSubmission: boolean, attachments?: Array<{ attachmentId: number, originalName: string, extension: string, sizeKb: number, formattedSize: string }> }>}
 */
export const getAssignmentDetail = async (assignmentId) => {
  const { data } = await axiosInstance.get(`/api/v1/assignments/${assignmentId}`);
  return data;
};

/**
 * 내 특정 과제 제출물 조회
 * GET /api/v1/assignments/{assignmentId}/submission
 * 제출한 적이 없으면 백엔드가 404(NOT_FOUND)를 내려주므로 그 경우 null로 정규화한다.
 * @returns {Promise<{ submissionId: number, textContent: string, isLate: boolean, createdAt: string, updatedAt: string, files: Array<{ attachmentId: number, originalName: string, extension: string, sizeKb: number }> } | null>}
 */
export const getMySubmission = async (assignmentId) => {
  try {
    const { data } = await axiosInstance.get(`/api/v1/assignments/${assignmentId}/submission`);
    return data ?? null;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
};

/**
 * 내 제출 내역 목록 조회 (모든 과제에 대한 제출 이력, created_at 내림차순 고정 정렬)
 * GET /api/v1/members/me/submissions
 * 과제 목록 화면에서 과제별 제출 상태 배지(제출완료/지각제출/진행중/마감)를 계산하려고 쓴다.
 * 학생 한 명의 과제 수가 아주 많지는 않을 거라 가정하고 size를 넉넉하게 잡아 한 번에 가져온다.
 * @param {{ page?: number, size?: number }} params
 * @returns {Promise<{ content: Array<{ submissionId: number, assignmentId: number, assignmentTitle: string, textContent: string, isLate: boolean, createdAt: string, updatedAt: string }>, totalPages: number }>}
 */
export const getMySubmissions = async (params = {}) => {
  const { data } = await axiosInstance.get("/api/v1/members/me/submissions", { params });
  return data;
};

// 백엔드 SubmissionService의 파일 검증 기준과 동일하게 맞춘 클라이언트측 사전 체크용 상수.
// (실제 검증은 서버가 최종적으로 하고, 여기서는 업로드 전에 빠르게 피드백만 준다.)
export const SUBMISSION_FILE_MAX_COUNT = 5;
export const SUBMISSION_FILE_MAX_SIZE_BYTES = 50 * 1024 * 1024;
export const SUBMISSION_FILE_MAX_TOTAL_SIZE_BYTES = 100 * 1024 * 1024;

/**
 * 과제 최초 제출
 * POST /api/v1/assignments/{assignmentId}/submission (multipart/form-data)
 * 백엔드가 최대 5개, 개당 50MB, 총 100MB까지 파일 첨부를 지원한다. textContent와 files 중
 * 하나 이상은 필수(둘 다 비어있으면 400).
 * @param {number|string} assignmentId
 * @param {{ textContent: string, files?: File[] }} payload
 */
export const submitAssignment = async (assignmentId, { textContent, files = [] }) => {
  const formData = new FormData();
  formData.append(
    "request",
    new Blob([JSON.stringify({ textContent })], { type: "application/json" })
  );
  files.forEach((file) => formData.append("files", file));
  const { data } = await axiosInstance.post(
    `/api/v1/assignments/${assignmentId}/submission`,
    formData
  );
  return data;
};

/**
 * 재제출 / 전체 수정
 * PUT /api/v1/assignments/{assignmentId}/submission (multipart/form-data)
 *
 * ⚠️ 백엔드는 재제출 시 기존에 첨부돼 있던 파일을 전부 지우고 이번 요청의 files로 통째로
 * 교체한다(부분 추가가 아니다). 즉 파일을 첨부하지 않고 재제출하면 기존 첨부파일도 모두
 * 사라진다 — 이전 파일을 유지하려면 이번 요청에도 다시 첨부해야 한다(원본 파일을 서버에서
 * 다시 내려받아 재업로드하는 방식은 지원하지 않으므로, 학생이 로컬에 갖고 있는 파일을 다시
 * 선택해야 한다). 화면에는 이 사실을 안내 문구로 명시한다.
 *
 * 백엔드가 마감 이후 && allowLateSubmission=false 이면 이 요청 자체를 400으로 막으므로,
 * 프론트에서도 같은 조건일 때 재제출 폼을 아예 못 열게 막아야 한다.
 * @param {number|string} assignmentId
 * @param {{ textContent: string, files?: File[] }} payload
 */
export const resubmitAssignment = async (assignmentId, { textContent, files = [] }) => {
  const formData = new FormData();
  formData.append(
    "request",
    new Blob([JSON.stringify({ textContent })], { type: "application/json" })
  );
  files.forEach((file) => formData.append("files", file));
  const { data } = await axiosInstance.put(
    `/api/v1/assignments/${assignmentId}/submission`,
    formData
  );
  return data;
};

/**
 * 제출 파일 개별 삭제 (전체 재제출 없이 파일 하나만 뗄 때)
 * DELETE /api/v1/submission-attachments/{attachmentId}
 * 본인 제출물만 가능하고, 마감 후 지각 제출 불가 과제면 막힌다(백엔드 determineLateAndRequireEditable).
 * 삭제 후 텍스트도 없고 파일도 하나도 안 남으면 400 — 그럴 땐 제출물 전체 삭제(deleteSubmission)를 써야 한다.
 * @param {number|string} attachmentId
 */
export const deleteSubmissionAttachment = async (attachmentId) => {
  await axiosInstance.delete(`/api/v1/submission-attachments/${attachmentId}`);
};

/**
 * 제출 파일 다운로드 URL 조회 (Presigned URL)
 * GET /api/v1/submission-attachments/{attachmentId}/download-url
 * 학생이 제출할 때 함께 올린 파일을 다시 받을 때 쓴다 (관리자가 올려둔 안내 파일이 아니다).
 * @returns {Promise<{ downloadUrl: string, expiresIn: number, originalName: string }>}
 */
export const getSubmissionAttachmentDownloadUrl = async (attachmentId) => {
  const { data } = await axiosInstance.get(
    `/api/v1/submission-attachments/${attachmentId}/download-url`
  );
  return data;
};

/**
 * 과제 등록 (관리자 전용)
 * POST /api/v1/assignments
 * dueAt은 백엔드가 "uuuu-MM-dd'T'HH:mm:ss" 형식(초 단위 포함, 타임존 없이 Asia/Seoul 기준으로
 * 해석됨)만 엄격하게 허용한다 — <input type="datetime-local"> 값은 초가 빠져있으므로
 * 호출하는 쪽(AssignmentWritePage)에서 ":00"을 붙여서 넘겨야 한다.
 * @param {{ title: string, content: string, dueAt: string, allowLateSubmission: boolean }} payload
 * @returns {Promise<{ assignmentId: number }>}
 */
export const createAssignment = async ({ title, content, dueAt, allowLateSubmission }) => {
  const { data } = await axiosInstance.post("/api/v1/assignments", {
    title,
    content,
    dueAt,
    allowLateSubmission,
  });
  return data;
};

/**
 * 과제 수정 (관리자 전용) — 보낸 필드만 반영된다 (부분 수정 API)
 * PATCH /api/v1/assignments/{assignmentId}
 * @param {number|string} assignmentId
 * @param {{ title?: string, content?: string, dueAt?: string, allowLateSubmission?: boolean }} payload
 */
export const updateAssignment = async (assignmentId, payload) => {
  const { data } = await axiosInstance.patch(`/api/v1/assignments/${assignmentId}`, payload);
  return data;
};

/**
 * 과제 삭제 (관리자 전용) — 제출물이 하나라도 있으면 백엔드가 409로 막는다.
 * DELETE /api/v1/assignments/{assignmentId}
 */
export const deleteAssignment = async (assignmentId) => {
  await axiosInstance.delete(`/api/v1/assignments/${assignmentId}`);
};
