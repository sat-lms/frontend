import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getAssignmentDetail,
  getMySubmission,
  submitAssignment,
  resubmitAssignment,
  getSubmissionAttachmentDownloadUrl,
  deleteAssignment,
} from "../api/assignmentApi";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import "./AssignmentDetailPage.css";
import "./AdminWritePage.css";

/**
 * 과제 상세 + 제출/재제출. 명세서 24/31/32/33번 API 연동.
 *
 * ⚠️ 파일 첨부 업로드(32/33번의 files 파트)는 오늘 연동 범위에서 제외했다 — 아래 "파일 첨부"
 * 영역은 비활성 목업이고, 제출/재제출은 답안 텍스트(textContent)만 서버로 보낸다.
 * (백엔드 자체는 이미 파일 업로드를 지원하지만, 오늘은 텍스트 제출까지만 하기로 함.)
 *
 * 참고: 이 백엔드에는 "과제 참고 첨부파일"(관리자가 미리 올려두는 안내 파일) 개념이 없어서
 * 그 UI는 넣지 않았다. 파일은 학생이 제출할 때 같이 올리는 제출 첨부파일뿐이라, 이미 제출한
 * 파일이 있다면(추후 업로드 기능이 붙으면) 아래 "제출한 파일" 목록에서 내려받을 수 있다.
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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

  const startResubmit = () => {
    setSubmitError("");
    setTextContent(submission?.textContent ?? "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setSubmitError("");
    setEditing(false);
  };

  const handleSubmit = async () => {
    if (!textContent.trim()) {
      setSubmitError("답안 내용을 입력해 주세요.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError("");
    try {
      if (hasSubmission) {
        await resubmitAssignment(assignmentId, { textContent });
      } else {
        await submitAssignment(assignmentId, { textContent });
      }
      setEditing(false);
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
                      <button
                        key={file.attachmentId}
                        type="button"
                        className="assignment-file-chip"
                        onClick={() => handleDownloadFile(file.attachmentId)}
                      >
                        {file.originalName}
                      </button>
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
              <div className="assignment-form__file-mock">
                <div className="assignment-form__file-mock-title">파일 첨부는 준비 중입니다</div>
                <div className="assignment-form__file-mock-desc">
                  파일 첨부 기능 연동 전까지는 답안 텍스트만 제출됩니다.
                </div>
              </div>

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
