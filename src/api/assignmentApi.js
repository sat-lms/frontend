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
 * 참고: 이 백엔드는 "과제 참고 첨부파일"(관리자가 미리 올려두는 안내 파일) 개념이 없다.
 * 파일은 학생이 제출할 때 함께 올리는 제출 첨부파일(submission-attachments)뿐이다.
 * @returns {Promise<{ assignmentId: number, title: string, content: string, dueAt: string, allowLateSubmission: boolean }>}
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

/**
 * 과제 최초 제출
 * POST /api/v1/assignments/{assignmentId}/submission (multipart/form-data)
 *
 * ⚠️ 파일 첨부(files 파트)는 백엔드는 이미 지원하지만(최대 5개, 개당 50MB, 총 100MB),
 * 오늘 연동 범위에서는 제외하기로 해서 textContent만 보낸다. 화면의 파일 첨부 영역은 비활성 목업이다.
 * 나중에 붙일 때는 FormData에 files를 여러 번 append(file) 하면 된다.
 * @param {number|string} assignmentId
 * @param {{ textContent: string }} payload
 */
export const submitAssignment = async (assignmentId, { textContent }) => {
  const formData = new FormData();
  formData.append(
    "request",
    new Blob([JSON.stringify({ textContent })], { type: "application/json" })
  );
  const { data } = await axiosInstance.post(
    `/api/v1/assignments/${assignmentId}/submission`,
    formData
  );
  return data;
};

/**
 * 재제출 / 전체 수정
 * PUT /api/v1/assignments/{assignmentId}/submission (multipart/form-data)
 * 파일 첨부를 아직 보내지 않는 이유는 submitAssignment와 동일하다.
 * 백엔드가 마감 이후 && allowLateSubmission=false 이면 이 요청 자체를 400으로 막으므로,
 * 프론트에서도 같은 조건일 때 재제출 폼을 아예 못 열게 막아야 한다.
 * @param {number|string} assignmentId
 * @param {{ textContent: string }} payload
 */
export const resubmitAssignment = async (assignmentId, { textContent }) => {
  const formData = new FormData();
  formData.append(
    "request",
    new Blob([JSON.stringify({ textContent })], { type: "application/json" })
  );
  const { data } = await axiosInstance.put(
    `/api/v1/assignments/${assignmentId}/submission`,
    formData
  );
  return data;
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
