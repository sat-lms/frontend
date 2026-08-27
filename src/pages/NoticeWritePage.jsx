import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getNoticeDetail, createNotice, updateNotice } from "../api/noticeApi";
import AppLayout from "../components/AppLayout";
import "./AdminWritePage.css";

const TITLE_MAX_LENGTH = 100;

/**
 * 공지 작성/수정 화면 (관리자 전용). 명세서 20/22번 API 연동.
 * - /admin/notices/new 로 들어오면 작성 모드
 * - /admin/notices/:noticeId/edit 로 들어오면 수정 모드 (기존 값을 불러와 폼에 채워준다)
 */
function NoticeWritePage() {
  const { noticeId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!noticeId;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fetchExisting = useCallback(async () => {
    if (!isEditMode) return;
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await getNoticeDetail(noticeId);
      setTitle(data.title ?? "");
      setContent(data.content ?? "");
      setIsPinned(!!data.isPinned);
    } catch (err) {
      setLoadError(err.status === 404 ? "존재하지 않는 공지입니다." : "공지를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [isEditMode, noticeId]);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  const validate = () => {
    if (!title.trim()) return "제목을 입력해 주세요.";
    if (title.trim().length > TITLE_MAX_LENGTH) return `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`;
    if (!content.trim()) return "내용을 입력해 주세요.";
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
      const payload = { title: title.trim(), content: content.trim(), isPinned };
      if (isEditMode) {
        await updateNotice(noticeId, payload);
        navigate(`/notices/${noticeId}`);
      } else {
        const created = await createNotice(payload);
        navigate(`/notices/${created.noticeId}`);
      }
    } catch (err) {
      setSubmitError(err.message ?? "저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const backLink = isEditMode ? `/notices/${noticeId}` : "/notices";

  return (
    <AppLayout>
      <Link to={backLink} className="admin-write-page__back">
        ← {isEditMode ? "공지로 돌아가기" : "공지사항 목록으로"}
      </Link>

      <h1 className="page-title">{isEditMode ? "공지 수정" : "공지 작성"}</h1>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        학과 및 시스템 공지를 {isEditMode ? "수정" : "등록"}하세요
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
            <label className="admin-write-label" htmlFor="notice-title">
              제목
            </label>
            <input
              id="notice-title"
              type="text"
              className="admin-write-input"
              value={title}
              maxLength={TITLE_MAX_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지 제목을 입력하세요"
            />
            <p className="admin-write-hint">
              {title.trim().length} / {TITLE_MAX_LENGTH}자
            </p>
          </div>

          <div className="admin-write-field">
            <label className="admin-write-label" htmlFor="notice-content">
              내용
            </label>
            <textarea
              id="notice-content"
              className="admin-write-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지 내용을 입력하세요"
            />
          </div>

          <div className="admin-write-field">
            <label className="admin-write-checkbox">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
              />
              상단에 고정
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
              {isSubmitting ? "저장 중..." : isEditMode ? "수정 완료" : "공지 등록"}
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default NoticeWritePage;
