import axiosInstance from "./axiosInstance";

/**
 * 과제 목록 조회
 * GET /api/v1/assignments
 * STUDENT로 조회하면 각 과제 항목에 내 제출 상태(submissionStatus)가 함께 내려온다:
 *   - IN_PROGRESS: 미제출이지만 아직 제출 가능 (마감이 지났어도 지각 제출이 허용되면 여기 포함)
 *   - NOT_SUBMITTED: 미제출이고 마감됐으며 지각 제출도 불가능
 *   - SUBMITTED: 정상 제출 완료
 *   - LATE: 지각 제출 완료
 * ADMIN으로 조회하면 submissionStatus는 null이다(관리자는 제출자가 아니므로 개인 제출 상태가 없음).
 * 기존 정렬 형식은 그대로 유지된다.
 * @param {{ page?: number, size?: number }} params
 * @returns {Promise<{ content: Array<{ assignmentId: number, title: string, dueAt: string, allowLateSubmission: boolean, submissionStatus: "IN_PROGRESS" | "NOT_SUBMITTED" | "SUBMITTED" | "LATE" | null }>, totalPages: number }>}
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
 * 내 제출 내역 목록 조회
 * GET /api/v1/members/me/submissions
 *
 * includeNotSubmitted 기본값이 true라 미제출 과제도 함께 내려온다(false로 보내면 예전처럼
 * 내가 실제로 제출한 과제만 조회됨). 미제출 항목은 submissionId가 null이고 submittedAt /
 * textContent / createdAt / updatedAt도 null, attachments / fileNames는 빈 배열, isLate는
 * false로 내려온다 — 목록 항목을 식별할 때는 submissionId가 아니라 assignmentId를 쓰고,
 * submissionId가 없는 항목에는 제출물 조회·삭제 같은 동작을 연결하면 안 된다.
 *
 * submissionStatus: IN_PROGRESS(미제출·제출가능, 마감이 지났어도 지각 제출이 가능하면 포함) /
 * NOT_SUBMITTED(미제출·마감·지각불가) / SUBMITTED(정상 제출) / LATE(지각 제출).
 *
 * sort: dueAtDesc(기본) / dueAtAsc / submittedAtDesc(마지막 제출·재제출 시각 내림차순, 미제출은 맨 뒤)
 * 예: ?includeNotSubmitted=true&sort=dueAtAsc&page=0&size=20
 *
 * 참고: 과제 목록 화면(AssignmentListPage)과 대시보드의 "다가오는 과제" 위젯(DashboardPage)은
 * 이제 GET /api/v1/assignments가 함께 내려주는 submissionStatus로 과제별 상태를 바로 계산하므로
 * 이 함수를 호출하지 않는다(백엔드가 이미 계산해 주는 상태를 프론트에서 다시 계산하던 중복 로직을
 * 제거했다). 개인 제출 이력만 별도로 나열하는 화면이 새로 생기면 그때 이 함수를 사용한다.
 *
 * @param {{ page?: number, size?: number, includeNotSubmitted?: boolean, sort?: "dueAtDesc" | "dueAtAsc" | "submittedAtDesc" }} params
 * @returns {Promise<{ content: Array<{ submissionId: number | null, assignmentId: number, assignmentTitle: string, dueAt: string, textContent: string | null, isLate: boolean, submittedAt: string | null, createdAt: string | null, updatedAt: string | null, fileNames: string[], attachments: Array<Object>, submissionStatus: "IN_PROGRESS" | "NOT_SUBMITTED" | "SUBMITTED" | "LATE" }>, totalPages: number }>}
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
 * 제출물 전체 삭제 (텍스트 + 첨부파일 전부)
 * DELETE /api/v1/assignments/{assignmentId}/submission
 * 파일 하나만 뗄 때는 deleteSubmissionAttachment를 쓰고, 텍스트/파일을 통째로 지워
 * "제출 안 한 상태"로 되돌릴 때만 이 함수를 쓴다 (명세서 34번).
 * @param {number|string} assignmentId
 */
export const deleteSubmission = async (assignmentId) => {
  await axiosInstance.delete(`/api/v1/assignments/${assignmentId}/submission`);
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
