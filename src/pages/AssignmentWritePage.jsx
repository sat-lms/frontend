import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getAssignmentDetail, createAssignment, updateAssignment } from "../api/assignmentApi";
import {
  uploadAssignmentAttachments,
  deleteAssignmentAttachment,
  ASSIGNMENT_FILE_MAX_COUNT,
  ASSIGNMENT_FILE_MAX_SIZE_BYTES,
  ASSIGNMENT_FILE_MAX_TOTAL_SIZE_BYTES,
  ASSIGNMENT_FILE_ACCEPT,
} from "../api/assignmentAttachmentApi";
import AppLayout from "../components/AppLayout";
import "./AdminWritePage.css";
import "./AssignmentDetailPage.css"; // 첨부파일 칩(.assignment-file-chip) + 파일 선택 버튼 스타일 재사용

/**
 * 과제 등록/수정 화면 (관리자 전용). 명세서 25/27/28/30번 API 연동.
 * - /admin/assignments/new 로 들어오면 등록 모드
 * - /admin/assignments/:assignmentId/edit 로 들어오면 수정 모드 (기존 값을 불러와 폼에 채워준다)
 *
 * 마감 시각은 <input type="datetime-local">로 받는데, 백엔드(AssignmentCreateRequest)는
 * "uuuu-MM-dd'T'HH:mm:ss" 형식(초 포함, 타임존 없음 — Asia/Seoul 기준으로 서버가 해석)만
 * 엄격하게 허용해서 초를 붙여 보내야 하고, 백엔드에서 받은 OffsetDateTime 문자열은 반대로
 * datetime-local이 이해하는 "YYYY-MM-DDTHH:mm" 형태로 잘라줘야 한다.
 *
 * 참고 첨부파일(관리자가 미리 올려두는 안내 파일)은 과제 본문과 별도 API
 * (POST /assignments/{assignmentId}/attachments)라서 assignmentId가 있어야 올릴 수 있다.
 * 그래서 등록 모드에서는 "과제 등록" 먼저 성공시켜 assignmentId를 받은 뒤(로컬에
 * savedAssignmentId로 기억) 그 자리에서 이어서 파일을 업로드한다 — 공지 작성 화면과 같은 패턴.
 *
 * 기존 첨부파일 목록은 별도 API가 아니라 수정 모드 진입 시 불러오는 과제 상세 조회
 * (getAssignmentDetail) 응답의 attachments 필드로 함께 내려온다.
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

  // 등록 모드에서 저장이 먼저 성공하면 여기에 assignmentId가 채워진다 (수정 모드면 URL의
  // assignmentId를 그대로 씀).
  const [savedAssignmentId, setSavedAssignmentId] = useState(null);
  const effectiveAssignmentId = assignmentId ?? savedAssignmentId;

  const [existingAttachments, setExistingAttachments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);

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
      setExistingAttachments(data.attachments ?? []);
    } catch (err) {
      setLoadError(err.status === 404 ? "존재하지 않는 과제입니다." : "과제를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [isEditMode, assignmentId]);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  const totalAttachmentCount = existingAttachments.length + selectedFiles.length;

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    const combinedCount = existingAttachments.length + selectedFiles.length + picked.length;
    if (combinedCount > ASSIGNMENT_FILE_MAX_COUNT) {
      setSubmitError(`과제 참고 첨부파일은 최대 ${ASSIGNMENT_FILE_MAX_COUNT}개까지 등록할 수 있습니다.`);
      return;
    }
    const oversizedFile = picked.find((file) => file.size > ASSIGNMENT_FILE_MAX_SIZE_BYTES);
    if (oversizedFile) {
      setSubmitError(`파일 1개의 용량은 ${ASSIGNMENT_FILE_MAX_SIZE_BYTES / 1024 / 1024}MB를 초과할 수 없습니다.`);
      return;
    }
    const combined = [...selectedFiles, ...picked];
    const totalSize = combined.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > ASSIGNMENT_FILE_MAX_TOTAL_SIZE_BYTES) {
      setSubmitError(`전체 파일 용량은 ${ASSIGNMENT_FILE_MAX_TOTAL_SIZE_BYTES / 1024 / 1024}MB를 초과할 수 없습니다.`);
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
      await deleteAssignmentAttachment(attachmentId);
      setExistingAttachments((prev) => prev.filter((a) => a.attachmentId !== attachmentId));
    } catch (err) {
      alert(err.message ?? "첨부파일 삭제에 실패했습니다.");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

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

      // 1) 과제 본문 저장 (아직 저장 전이면 등록, 이미 저장됐으면 수정).
      let targetAssignmentId = effectiveAssignmentId;
      if (targetAssignmentId) {
        await updateAssignment(targetAssignmentId, payload);
      } else {
        const created = await createAssignment(payload);
        targetAssignmentId = created.assignmentId;
        setSavedAssignmentId(created.assignmentId);
      }

      // 2) 새로 고른 참고 첨부파일이 있으면 이어서 업로드. 여기서 실패해도 과제 본문은 이미
      //    저장됐으므로 페이지를 벗어나지 않고 다시 "저장"을 눌러 업로드만 재시도할 수 있게 한다.
      if (selectedFiles.length > 0) {
        const uploaded = await uploadAssignmentAttachments(targetAssignmentId, selectedFiles);
        setExistingAttachments((prev) => [...prev, ...uploaded]);
        setSelectedFiles([]);
        setFileInputKey((prev) => prev + 1);
      }

      navigate(`/assignments/${targetAssignmentId}`);
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

          <div className="admin-write-field">
            <label className="admin-write-label">참고 첨부파일</label>

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

            {totalAttachmentCount < ASSIGNMENT_FILE_MAX_COUNT && (
              <label className="assignment-form__file-input-label">
                <input
                  key={fileInputKey}
                  type="file"
                  multiple
                  accept={ASSIGNMENT_FILE_ACCEPT}
                  className="assignment-form__file-input"
                  onChange={handleFileChange}
                />
                <span>+ 파일 선택</span>
                <span className="assignment-form__file-input-hint">
                  최대 {ASSIGNMENT_FILE_MAX_COUNT}개 · 개당 {ASSIGNMENT_FILE_MAX_SIZE_BYTES / 1024 / 1024}MB ·
                  전체 {ASSIGNMENT_FILE_MAX_TOTAL_SIZE_BYTES / 1024 / 1024}MB 이내
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
