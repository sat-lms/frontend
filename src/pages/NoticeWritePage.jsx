import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getNoticeDetail, createNotice, updateNotice } from "../api/noticeApi";
import {
  getNoticeAttachments,
  uploadNoticeAttachments,
  deleteNoticeAttachment,
  NOTICE_FILE_MAX_COUNT,
  NOTICE_FILE_MAX_SIZE_BYTES,
  NOTICE_FILE_MAX_TOTAL_SIZE_BYTES,
  NOTICE_FILE_ACCEPT,
} from "../api/noticeAttachmentApi";
import AppLayout from "../components/AppLayout";
import "./AdminWritePage.css";
import "./AssignmentDetailPage.css"; // 첨부파일 칩(.assignment-file-chip) + 파일 선택 버튼 스타일 재사용

const TITLE_MAX_LENGTH = 100;

/**
 * 공지 작성/수정 화면 (관리자 전용). 명세서 20/22번 API 연동 + 첨부파일 업로드/삭제.
 * - /admin/notices/new 로 들어오면 작성 모드
 * - /admin/notices/:noticeId/edit 로 들어오면 수정 모드 (기존 값을 불러와 폼에 채워준다)
 *
 * 첨부파일은 공지 본문과 별도 API(POST /notices/{noticeId}/attachments)라서 noticeId가 있어야
 * 올릴 수 있다. 그래서 작성 모드에서는 "공지 등록" 먼저 성공시켜 noticeId를 받은 뒤(로컬에
 * savedNoticeId로 기억) 그 자리에서 이어서 파일을 업로드한다 — 등록 자체는 됐는데 파일
 * 업로드만 실패하는 경우를 대비해, 실패하면 페이지를 벗어나지 않고 재시도할 수 있게 한다.
 *
 * ⚠️ 기존 첨부파일 목록(getNoticeAttachments)은 백엔드에 목록 조회 API가 아직 없으면 조용히
 * 빈 배열로 처리된다 — 그 경우 이번 세션에서 새로 올린 파일만 화면에 보인다(README 삼아 남김).
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

  // 작성 모드에서 등록이 먼저 성공하면 여기에 noticeId가 채워진다 (수정 모드면 URL의 noticeId를 그대로 씀).
  const [savedNoticeId, setSavedNoticeId] = useState(null);
  const effectiveNoticeId = noticeId ?? savedNoticeId;

  const [existingAttachments, setExistingAttachments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);

  const fetchExisting = useCallback(async () => {
    if (!isEditMode) return;
    setIsLoading(true);
    setLoadError("");
    try {
      const [data, attachmentsData] = await Promise.all([
        getNoticeDetail(noticeId),
        getNoticeAttachments(noticeId).catch(() => []),
      ]);
      setTitle(data.title ?? "");
      setContent(data.content ?? "");
      setIsPinned(!!data.isPinned);
      setExistingAttachments(attachmentsData);
    } catch (err) {
      setLoadError(err.status === 404 ? "존재하지 않는 공지입니다." : "공지를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [isEditMode, noticeId]);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  const totalAttachmentCount = existingAttachments.length + selectedFiles.length;

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    const combinedCount = existingAttachments.length + selectedFiles.length + picked.length;
    if (combinedCount > NOTICE_FILE_MAX_COUNT) {
      setSubmitError(`공지 첨부파일은 최대 ${NOTICE_FILE_MAX_COUNT}개까지 등록할 수 있습니다.`);
      return;
    }
    const oversizedFile = picked.find((file) => file.size > NOTICE_FILE_MAX_SIZE_BYTES);
    if (oversizedFile) {
      setSubmitError(`파일 1개의 용량은 ${NOTICE_FILE_MAX_SIZE_BYTES / 1024 / 1024}MB를 초과할 수 없습니다.`);
      return;
    }
    const combined = [...selectedFiles, ...picked];
    const totalSize = combined.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > NOTICE_FILE_MAX_TOTAL_SIZE_BYTES) {
      setSubmitError(`전체 파일 용량은 ${NOTICE_FILE_MAX_TOTAL_SIZE_BYTES / 1024 / 1024}MB를 초과할 수 없습니다.`);
      return;
    }

    setSubmitError("");
    setSelectedFiles(combined);
    setFileInputKey((prev) => prev + 1);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingAttachment = async (attachmentId) => {
    if (!window.confirm("이 첨부파일을 삭제할까요?")) return;
    setDeletingAttachmentId(attachmentId);
    try {
      await deleteNoticeAttachment(attachmentId);
      setExistingAttachments((prev) => prev.filter((a) => a.attachmentId !== attachmentId));
    } catch (err) {
      alert(err.message ?? "첨부파일 삭제에 실패했습니다.");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

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

      // 1) 공지 본문 저장 (아직 저장 전이면 등록, 이미 저장됐으면 수정).
      let targetNoticeId = effectiveNoticeId;
      if (targetNoticeId) {
        await updateNotice(targetNoticeId, payload);
      } else {
        const created = await createNotice(payload);
        targetNoticeId = created.noticeId;
        setSavedNoticeId(created.noticeId);
      }

      // 2) 새로 고른 파일이 있으면 이어서 업로드. 여기서 실패해도 공지 본문은 이미 저장됐으므로
      //    페이지를 벗어나지 않고 다시 "저장"을 눌러 업로드만 재시도할 수 있게 한다.
      if (selectedFiles.length > 0) {
        const uploaded = await uploadNoticeAttachments(targetNoticeId, selectedFiles);
        setExistingAttachments((prev) => [...prev, ...uploaded]);
        setSelectedFiles([]);
        setFileInputKey((prev) => prev + 1);
      }

      navigate(`/notices/${targetNoticeId}`);
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

          <div className="admin-write-field">
            <label className="admin-write-label">첨부파일</label>

            {existingAttachments.length > 0 && (
              <div className="assignment-detail__refs-list" style={{ marginBottom: 10 }}>
                {existingAttachments.map((file) => (
                  <span key={file.attachmentId} className="assignment-file-chip">
                    <span className="assignment-file-chip__name">
                      {file.originalName}
                      {file.formattedSize && (
                        <span className="assignment-file-chip__size"> · {file.formattedSize}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="assignment-file-chip__remove"
                      onClick={() => handleDeleteExistingAttachment(file.attachmentId)}
                      disabled={deletingAttachmentId === file.attachmentId}
                      aria-label={`${file.originalName} 삭제`}
                      title="첨부파일 삭제"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {totalAttachmentCount < NOTICE_FILE_MAX_COUNT && (
              <label className="assignment-form__file-input-label">
                <input
                  key={fileInputKey}
                  type="file"
                  multiple
                  accept={NOTICE_FILE_ACCEPT}
                  className="assignment-form__file-input"
                  onChange={handleFileChange}
                />
                <span>+ 파일 선택</span>
                <span className="assignment-form__file-input-hint">
                  최대 {NOTICE_FILE_MAX_COUNT}개 · 개당 {NOTICE_FILE_MAX_SIZE_BYTES / 1024 / 1024}MB ·
                  전체 {NOTICE_FILE_MAX_TOTAL_SIZE_BYTES / 1024 / 1024}MB 이내
                </span>
              </label>
            )}

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
