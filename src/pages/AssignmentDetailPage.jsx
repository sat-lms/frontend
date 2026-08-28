import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getAssignmentDetail,
  getMySubmission,
  submitAssignment,
  resubmitAssignment,
  getSubmissionAttachmentDownloadUrl,
  deleteSubmissionAttachment,
  deleteAssignment,
  SUBMISSION_FILE_MAX_COUNT,
  SUBMISSION_FILE_MAX_SIZE_BYTES,
  SUBMISSION_FILE_MAX_TOTAL_SIZE_BYTES,
} from "../api/assignmentApi";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import "./AssignmentDetailPage.css";
import "./AdminWritePage.css";

/**
 * 과제 상세 + 제출/재제출. 명세서 24/31/32/33번 API 연동.
 *
 * 파일 첨부 업로드(32/33번의 files 파트)까지 연동한다. 백엔드는 최대 5개, 개당 50MB,
 * 총 100MB까지 지원한다(SubmissionService 기준).
 *
 * ⚠️ 재제출은 "부분 수정"이 아니라 파일을 통째로 교체하는 방식이다 — 재제출 요청에 파일을
 * 안 실으면 기존에 첨부돼 있던 파일도 같이 사라진다(백엔드가 이전 첨부를 전부 지우고 이번
 * 요청 것으로 바꿔치기함). 원본 파일 바이트를 서버에서 다시 받아와 재업로드하는 건
 * 불가능하므로(다운로드 URL만 있음), 기존 파일을 유지하고 싶으면 재제출할 때 로컬에서
 * 다시 선택해서 첨부해야 한다 — 이 사실을 재제출 폼에 안내 문구로 명시한다.
 * 파일 하나만 떼고 싶을 때는 전체 재제출 대신 개별 삭제(DELETE .../submission-attachments/{id})를 쓴다.
 *
 * 참고: 이 백엔드에는 "과제 참고 첨부파일"(관리자가 미리 올려두는 안내 파일) 개념이 없어서
 * 그 UI는 넣지 않았다. 파일은 학생이 제출할 때 같이 올리는 제출 첨부파일뿐이다.
 */
function AssignmentDetailPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      // 제출물 조회(GET .../submission)는 백엔드가 학생 전용으로 제한한다(requireStudent).
      // 관리자 계정으로 호출하면 403이 나므로, 관리자일 때는 아예 호출하지 않는다.
      const [assignmentData, submissionData] = await Promise.all([
        getAssignmentDetail(assignmentId),
        isAdmin ? Promise.resolve(null) : getMySubmission(assignmentId),
      ]);
      setAssignment(assignmentData);
      setSubmission(submissionData);
    } catch (err) {
      setError(err.status === 404 ? "존재하지 않는 과제입니다." : "과제를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, isAdmin]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const hasSubmission = !!submission;

  // 백엔드는 마감시각이 지났고 지각 제출이 허용되지 않으면 최초 제출/재제출 요청 자체를
  // 400으로 막는다(이미 제출물이 있어도 마찬가지). 프론트도 같은 조건으로 폼을 잠근다.
  const isPastDue = !!assignment?.dueAt && new Date() > new Date(assignment.dueAt);
  const canModify = !assignment || assignment.allowLateSubmission || !isPastDue;
  const isClosed = !canModify;

  // 관리자는 제출자가 아니므로 학생용 제출 내역/제출 폼을 아예 보여주지 않는다.
  const showReceipt = !isAdmin && hasSubmission && !editing;
  const showForm = !isAdmin && canModify && (!hasSubmission || editing);

  const resetFileSelection = () => {
    setSelectedFiles([]);
    setFileInputKey((prev) => prev + 1);
  };

  const startResubmit = () => {
    setSubmitError("");
    setTextContent(submission?.textContent ?? "");
    resetFileSelection();
    setEditing(true);
  };

  const cancelEdit = () => {
    setSubmitError("");
    resetFileSelection();
    setEditing(false);
  };

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    const combined = [...selectedFiles, ...picked];
    if (combined.length > SUBMISSION_FILE_MAX_COUNT) {
      setSubmitError(`파일은 최대 ${SUBMISSION_FILE_MAX_COUNT}개까지 첨부할 수 있습니다.`);
      return;
    }
    const oversizedFile = picked.find((file) => file.size > SUBMISSION_FILE_MAX_SIZE_BYTES);
    if (oversizedFile) {
      setSubmitError(`파일 1개의 용량은 ${SUBMISSION_FILE_MAX_SIZE_BYTES / 1024 / 1024}MB를 초과할 수 없습니다.`);
      return;
    }
    const totalSize = combined.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > SUBMISSION_FILE_MAX_TOTAL_SIZE_BYTES) {
      setSubmitError(`전체 파일 용량은 ${SUBMISSION_FILE_MAX_TOTAL_SIZE_BYTES / 1024 / 1024}MB를 초과할 수 없습니다.`);
      return;
    }

    setSubmitError("");
    setSelectedFiles(combined);
    setFileInputKey((prev) => prev + 1); // 같은 파일을 다시 골라도 onChange가 또 발생하도록 input을 리셋
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!textContent.trim() && selectedFiles.length === 0) {
      setSubmitError("답안 내용이나 파일을 하나 이상 입력해 주세요.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError("");
    try {
      if (hasSubmission) {
        await resubmitAssignment(assignmentId, { textContent, files: selectedFiles });
      } else {
        await submitAssignment(assignmentId, { textContent, files: selectedFiles });
      }
      setEditing(false);
      resetFileSelection();
      await fetchAll();
    } catch (err) {
      setSubmitError(err.message ?? "제출에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadFile = async (attachmentId) => {
    try {
      const { downloadUrl } = await getSubmissionAttachmentDownloadUrl(attachmentId);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch {
      alert("파일 다운로드 링크를 가져오지 못했습니다.");
    }
  };

  // 전체 재제출 없이 이미 제출된 파일 하나만 뗀다. 삭제 후 텍스트도 파일도 하나도 안 남으면
  // 백엔드가 400으로 막고 "제출물 전체를 삭제하려면..." 안내 메시지를 내려주므로 그대로 보여준다.
  const handleDeleteFile = async (attachmentId) => {
    if (!window.confirm("이 파일을 삭제할까요?")) return;
    setDeletingAttachmentId(attachmentId);
    try {
      await deleteSubmissionAttachment(attachmentId);
      await fetchAll();
    } catch (err) {
      alert(err.message ?? "파일 삭제에 실패했습니다.");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!window.confirm("이 과제를 삭제할까요? 삭제하면 되돌릴 수 없습니다.")) return;
    setIsDeleting(true);
    try {
      await deleteAssignment(assignmentId);
      navigate("/assignments");
    } catch (err) {
      // 제출물이 이미 있는 과제는 백엔드가 409로 막는다 (submissionRepository.existsByAssignmentId).
      alert(err.status === 409 ? "제출물이 있는 과제는 삭제할 수 없습니다." : err.message ?? "삭제에 실패했습니다.");
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <Link to="/assignments" className="assignment-detail-page__back">
        ← 목록으로
      </Link>

      {isLoading && <p className="assignment-detail-page__state">불러오는 중...</p>}

      {!isLoading && error && (
        <p className="assignment-detail-page__state assignment-detail-page__state--error">{error}</p>
      )}

      {!isLoading && !error && assignment && (
        <article className="assignment-detail">
          <div className="assignment-detail__head">
            <h1 className="assignment-detail__title">{assignment.title}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isAdmin && (
                <div className="admin-detail-actions">
                  <Link to={`/admin/assignments/${assignmentId}/edit`} className="admin-detail-actions__btn">
                    수정
                  </Link>
                  <button
                    type="button"
                    className="admin-detail-actions__btn admin-detail-actions__btn--danger"
                    onClick={handleDeleteAssignment}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              )}
              <StatusBadge hasSubmission={hasSubmission} isLate={submission?.isLate} isClosed={isClosed} />
            </div>
          </div>
          <p className="assignment-detail__due">
            마감일시 · {formatDateTime(assignment.dueAt)}
            {assignment.allowLateSubmission && " · 지각 제출 허용"}
          </p>
          <div className="assignment-detail__content">{assignment.content}</div>

          {showReceipt && (
            <div className="assignment-receipt">
              <div className="assignment-receipt__head">
                <span className={`assignment-receipt__label ${submission.isLate ? "is-late" : "is-submitted"}`}>
                  {submission.isLate ? "지각 제출" : "제출 완료"} ·{" "}
                  {formatDateTime(submission.updatedAt ?? submission.createdAt)}
                </span>
                {canModify && (
                  <button type="button" className="assignment-btn assignment-btn--ghost" onClick={startResubmit}>
                    재제출
                  </button>
                )}
              </div>
              <p className="assignment-receipt__text">{submission.textContent || "(내용 없음)"}</p>

              {submission.files?.length > 0 && (
                <div className="assignment-detail__refs">
                  <p className="assignment-detail__refs-label">제출한 파일</p>
                  <div className="assignment-detail__refs-list">
                    {submission.files.map((file) => (
                      <span key={file.attachmentId} className="assignment-file-chip">
                        <button
                          type="button"
                          className="assignment-file-chip__name"
                          onClick={() => handleDownloadFile(file.attachmentId)}
                        >
                          {file.originalName}
                        </button>
                        {canModify && (
                          <button
                            type="button"
                            className="assignment-file-chip__remove"
                            onClick={() => handleDeleteFile(file.attachmentId)}
                            disabled={deletingAttachmentId === file.attachmentId}
                            aria-label={`${file.originalName} 삭제`}
                            title="파일 삭제"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {showForm && (
            <div className="assignment-form">
              <p className="assignment-form__label">답안 작성</p>
              <textarea
                className="assignment-form__textarea"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="과제에 대한 설명이나 답안을 입력하세요"
              />

              <p className="assignment-form__label">파일 첨부</p>
              {hasSubmission && (
                <p className="assignment-form__hint" style={{ margin: "0 0 10px" }}>
                  재제출하면 파일이 이번에 첨부한 것으로 통째로 교체됩니다. 기존 파일을 계속
                  유지하려면 아래에서 다시 선택해서 첨부해 주세요 — 아무것도 첨부하지 않으면
                  기존 파일도 함께 삭제됩니다.
                </p>
              )}
              <label className="assignment-form__file-input-label">
                <input
                  key={fileInputKey}
                  type="file"
                  multiple
                  className="assignment-form__file-input"
                  onChange={handleFileChange}
                />
                <span>+ 파일 선택</span>
                <span className="assignment-form__file-input-hint">
                  최대 {SUBMISSION_FILE_MAX_COUNT}개 · 개당 {SUBMISSION_FILE_MAX_SIZE_BYTES / 1024 / 1024}MB ·
                  전체 {SUBMISSION_FILE_MAX_TOTAL_SIZE_BYTES / 1024 / 1024}MB 이내
                </span>
              </label>

              {selectedFiles.length > 0 && (
                <div className="assignment-detail__refs-list" style={{ marginTop: 10 }}>
                  {selectedFiles.map((file, index) => (
                    <span key={`${file.name}-${file.lastModified}-${index}`} className="assignment-file-chip">
                      <span className="assignment-file-chip__name">{file.name}</span>
                      <button
                        type="button"
                        className="assignment-file-chip__remove"
                        onClick={() => removeSelectedFile(index)}
                        aria-label={`${file.name} 첨부 취소`}
                        title="첨부 취소"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {submitError && <p className="assignment-form__error">{submitError}</p>}

              <div className="assignment-form__actions">
                {editing && (
                  <button
                    type="button"
                    className="assignment-btn assignment-btn--ghost"
                    onClick={cancelEdit}
                    disabled={isSubmitting}
                  >
                    취소
                  </button>
                )}
                <button
                  type="button"
                  className="assignment-btn assignment-btn--primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "제출 중..." : hasSubmission ? "재제출하기" : "제출하기"}
                </button>
              </div>

              <p className="assignment-form__hint">
                마감 이후에는 지각 제출로 기록되며 감점될 수 있습니다. 마감 전까지 재제출로 수정할 수 있습니다.
              </p>
            </div>
          )}

          {!isAdmin && isClosed && (
            <div className="assignment-closed-banner">
              마감일이 지나 더 이상 {hasSubmission ? "수정" : "제출"}할 수 없습니다.
            </div>
          )}
        </article>
      )}
    </AppLayout>
  );
}

function StatusBadge({ hasSubmission, isLate, isClosed }) {
  let label = "진행중";
  let className = "is-progress";

  if (isLate) {
    label = "지각제출";
    className = "is-late";
  } else if (hasSubmission) {
    label = "제출완료";
    className = "is-submitted";
  } else if (isClosed) {
    label = "마감";
    className = "is-closed";
  }

  return <span className={`assignment-status-badge ${className}`}>{label}</span>;
}

function formatDateTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default AssignmentDetailPage;
