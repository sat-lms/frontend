import { useState, useEffect, useCallback } from "react";
import {
  getSubmissionComments,
  createSubmissionComment,
  updateSubmissionComment,
  deleteSubmissionComment,
  SUBMISSION_COMMENT_MAX_LENGTH,
} from "../api/submissionCommentApi";
import { useAuth } from "../context/AuthContext";
import "./SubmissionComments.css";

const PAGE_SIZE = 20;

/**
 * 제출물 댓글(피드백) 섹션. GitHub PR #100(이슈 #96)로 구현된 백엔드 API 연동.
 * 학생 제출 상세(AssignmentDetailPage, 제출 완료 후에만)와 관리자 제출물 상세 모달
 * (AdminSubmissionsPage) 양쪽에서 재사용한다.
 *
 * ⚠️ 백엔드 응답에 authorId가 없어서, "이 댓글이 내 것인지"는 이름 문자열 비교로만 판단한다
 * (동명이인이면 서로 헷갈릴 수 있음 — submissionCommentApi.js 상단 주석 참고).
 * 수정은 작성자 본인만, 삭제는 작성자 본인 또는 관리자만 가능하도록 버튼을 조건부로 보여주되,
 * 실제 권한 검사는 어차피 백엔드가 401/403으로 최종 확인한다.
 */
function SubmissionComments({ submissionId }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [comments, setComments] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [newContent, setNewContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchComments = useCallback(
    async (targetPage) => {
      setIsLoading(true);
      setError("");
      try {
        const data = await getSubmissionComments(submissionId, { page: targetPage, size: PAGE_SIZE });
        const list = Array.isArray(data) ? data : data.content ?? [];
        setComments((prev) => (targetPage === 0 ? list : [...prev, ...list]));
        setTotalPages(Array.isArray(data) ? 1 : data.totalPages ?? 1);
        setPage(targetPage);
      } catch (err) {
        setError(err.message ?? "댓글을 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    },
    [submissionId]
  );

  useEffect(() => {
    if (!submissionId) return;
    fetchComments(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  const handleLoadMore = () => {
    if (isLoading || page + 1 >= totalPages) return;
    fetchComments(page + 1);
  };

  const handlePost = async () => {
    const trimmed = newContent.trim();
    if (!trimmed) {
      setPostError("댓글 내용을 입력해 주세요.");
      return;
    }
    if (trimmed.length > SUBMISSION_COMMENT_MAX_LENGTH) {
      setPostError(`댓글은 최대 ${SUBMISSION_COMMENT_MAX_LENGTH}자까지 입력할 수 있습니다.`);
      return;
    }
    setIsPosting(true);
    setPostError("");
    try {
      const created = await createSubmissionComment(submissionId, trimmed);
      setComments((prev) => [...prev, created]);
      setNewContent("");
    } catch (err) {
      setPostError(err.message ?? "댓글 작성에 실패했습니다.");
    } finally {
      setIsPosting(false);
    }
  };

  const startEdit = (comment) => {
    setEditingId(comment.commentId);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (commentId) => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    setIsSavingEdit(true);
    try {
      const updated = await updateSubmissionComment(commentId, trimmed);
      setComments((prev) =>
        prev.map((c) => (c.commentId === commentId ? { ...c, content: updated?.content ?? trimmed } : c))
      );
      cancelEdit();
    } catch (err) {
      alert(err.message ?? "댓글 수정에 실패했습니다.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    setDeletingId(commentId);
    try {
      await deleteSubmissionComment(commentId);
      setComments((prev) => prev.filter((c) => c.commentId !== commentId));
    } catch (err) {
      alert(err.message ?? "댓글 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="submission-comments">
      <p className="submission-comments__label">
        댓글{comments.length > 0 && ` (${comments.length})`}
      </p>

      {isLoading && comments.length === 0 && (
        <p className="submission-comments__state">불러오는 중...</p>
      )}
      {!isLoading && error && comments.length === 0 && (
        <p className="submission-comments__state submission-comments__state--error">{error}</p>
      )}
      {!isLoading && !error && comments.length === 0 && (
        <p className="submission-comments__state">아직 댓글이 없습니다.</p>
      )}

      {comments.length > 0 && (
        <ul className="submission-comments__list">
          {comments.map((comment) => {
            const isMine = comment.authorName === user?.name;
            const canEdit = isMine;
            const canDelete = isMine || isAdmin;
            const isEditing = editingId === comment.commentId;

            return (
              <li key={comment.commentId} className="submission-comment">
                <div className="submission-comment__head">
                  <span className="submission-comment__author">
                    {comment.authorName}
                    <span
                      className={`submission-comment__role ${
                        comment.authorRole === "ADMIN" ? "is-admin" : "is-student"
                      }`}
                    >
                      {comment.authorRole === "ADMIN" ? "관리자" : "학생"}
                    </span>
                  </span>
                  <span className="submission-comment__date">{formatDateTime(comment.createdAt)}</span>
                </div>

                {isEditing ? (
                  <div className="submission-comment__edit">
                    <textarea
                      className="submission-comments__textarea"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      maxLength={SUBMISSION_COMMENT_MAX_LENGTH}
                      disabled={isSavingEdit}
                    />
                    <div className="submission-comment__edit-actions">
                      <button
                        type="button"
                        className="assignment-btn assignment-btn--ghost"
                        onClick={cancelEdit}
                        disabled={isSavingEdit}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        className="assignment-btn assignment-btn--primary"
                        style={{ flex: "none", padding: "9px 15px", fontSize: 14 }}
                        onClick={() => handleSaveEdit(comment.commentId)}
                        disabled={isSavingEdit || !editContent.trim()}
                      >
                        {isSavingEdit ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="submission-comment__text">{comment.content}</p>
                    {(canEdit || canDelete) && (
                      <div className="submission-comment__actions">
                        {canEdit && (
                          <button
                            type="button"
                            className="submission-comment__action-btn"
                            onClick={() => startEdit(comment)}
                          >
                            수정
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="submission-comment__action-btn submission-comment__action-btn--danger"
                            onClick={() => handleDelete(comment.commentId)}
                            disabled={deletingId === comment.commentId}
                          >
                            {deletingId === comment.commentId ? "삭제 중..." : "삭제"}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!isLoading && page + 1 < totalPages && (
        <button type="button" className="submission-comments__more-btn" onClick={handleLoadMore}>
          이전 댓글 더 보기
        </button>
      )}

      <div className="submission-comments__form">
        <textarea
          className="submission-comments__textarea"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="댓글을 입력하세요"
          maxLength={SUBMISSION_COMMENT_MAX_LENGTH}
          disabled={isPosting}
        />
        <div className="submission-comments__form-foot">
          <span className="submission-comments__counter">
            {newContent.length} / {SUBMISSION_COMMENT_MAX_LENGTH}
          </span>
          <button
            type="button"
            className="assignment-btn assignment-btn--primary"
            style={{ flex: "none", padding: "9px 18px", fontSize: 14 }}
            onClick={handlePost}
            disabled={isPosting || !newContent.trim()}
          >
            {isPosting ? "등록 중..." : "댓글 등록"}
          </button>
        </div>
        {postError && <p className="assignment-form__error">{postError}</p>}
      </div>
    </div>
  );
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

export default SubmissionComments;
