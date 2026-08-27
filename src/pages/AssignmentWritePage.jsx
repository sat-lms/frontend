import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getAssignmentDetail, createAssignment, updateAssignment } from "../api/assignmentApi";
import AppLayout from "../components/AppLayout";
import "./AdminWritePage.css";

/**
 * 과제 등록/수정 화면 (관리자 전용). 명세서 25/27번 API 연동.
 * - /admin/assignments/new 로 들어오면 등록 모드
 * - /admin/assignments/:assignmentId/edit 로 들어오면 수정 모드 (기존 값을 불러와 폼에 채워준다)
 *
 * 마감 시각은 <input type="datetime-local">로 받는데, 백엔드(AssignmentCreateRequest)는
 * "uuuu-MM-dd'T'HH:mm:ss" 형식(초 포함, 타임존 없음 — Asia/Seoul 기준으로 서버가 해석)만
 * 엄격하게 허용해서 초를 붙여 보내야 하고, 백엔드에서 받은 OffsetDateTime 문자열은 반대로
 * datetime-local이 이해하는 "YYYY-MM-DDTHH:mm" 형태로 잘라줘야 한다.
 */
function AssignmentWritePage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!assignmentId;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [allowLateSubmission, setAllowLateSubmission] = useState(false);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fetchExisting = useCallback(async () => {
    if (!isEditMode) return;
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await getAssignmentDetail(assignmentId);
      setTitle(data.title ?? "");
      setContent(data.content ?? "");
      setDueAt(toDatetimeLocalValue(data.dueAt));
      setAllowLateSubmission(!!data.allowLateSubmission);
    } catch (err) {
      setLoadError(err.status === 404 ? "존재하지 않는 과제입니다." : "과제를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [isEditMode, assignmentId]);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  const validate = () => {
    if (!title.trim()) return "제목을 입력해 주세요.";
    if (!content.trim()) return "내용을 입력해 주세요.";
    if (!dueAt) return "마감 시각을 입력해 주세요.";
    if (new Date(dueAt).getTime() <= Date.now()) return "마감 시각은 현재보다 미래여야 합니다.";
    return "";
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        dueAt: toBackendDateTime(dueAt),
        allowLateSubmission,
      };
      if (isEditMode) {
        await updateAssignment(assignmentId, payload);
        navigate(`/assignments/${assignmentId}`);
      } else {
        const created = await createAssignment(payload);
        navigate(`/assignments/${created.assignmentId}`);
      }
    } catch (err) {
      setSubmitError(err.message ?? "저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const backLink = isEditMode ? `/assignments/${assignmentId}` : "/assignments";

  return (
    <AppLayout>
      <Link to={backLink} className="admin-write-page__back">
        ← {isEditMode ? "과제로 돌아가기" : "과제 목록으로"}
      </Link>

      <h1 className="page-title">{isEditMode ? "과제 수정" : "과제 등록"}</h1>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        학생들에게 안내할 과제를 {isEditMode ? "수정" : "등록"}하세요
      </p>

      {isLoading && <p className="admin-write-page__state">불러오는 중...</p>}

      {!isLoading && loadError && (
        <p className="admin-write-page__state" style={{ color: "#c23b3b" }}>
          {loadError}
        </p>
      )}

      {!isLoading && !loadError && (
        <div className="admin-write-card">
          <div className="admin-write-field">
            <label className="admin-write-label" htmlFor="assignment-title">
              제목
            </label>
            <input
              id="assignment-title"
              type="text"
              className="admin-write-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="과제 제목을 입력하세요"
            />
          </div>

          <div className="admin-write-field">
            <label className="admin-write-label" htmlFor="assignment-content">
              내용
            </label>
            <textarea
              id="assignment-content"
              className="admin-write-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="과제 안내 내용을 입력하세요"
            />
          </div>

          <div className="admin-write-field">
            <label className="admin-write-label" htmlFor="assignment-due-at">
              마감 일시
            </label>
            <input
              id="assignment-due-at"
              type="datetime-local"
              className="admin-write-input"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          <div className="admin-write-field">
            <label className="admin-write-checkbox">
              <input
                type="checkbox"
                checked={allowLateSubmission}
                onChange={(e) => setAllowLateSubmission(e.target.checked)}
              />
              지각 제출 허용
            </label>
          </div>

          {submitError && <p className="admin-write-error">{submitError}</p>}

          <div className="admin-write-actions">
            <Link to={backLink} className="admin-write-btn admin-write-btn--ghost">
              취소
            </Link>
            <button
              type="button"
              className="admin-write-btn admin-write-btn--primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "저장 중..." : isEditMode ? "수정 완료" : "과제 등록"}
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// "2026-09-10T18:30" (datetime-local 값) -> "2026-09-10T18:30:00" (백엔드가 요구하는 형식)
function toBackendDateTime(datetimeLocalValue) {
  return datetimeLocalValue.length === 16 ? `${datetimeLocalValue}:00` : datetimeLocalValue;
}

// 백엔드가 내려주는 ISO 문자열(오프셋 포함, 예: "2026-09-10T18:30:00+09:00") ->
// <input type="datetime-local">이 이해하는 "2026-09-10T18:30" 형태로 변환
function toDatetimeLocalValue(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default AssignmentWritePage;
