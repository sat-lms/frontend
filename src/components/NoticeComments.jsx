import { useState, useEffect, useCallback } from "react";
import {
  getNoticeComments,
  createNoticeComment,
  updateNoticeComment,
  deleteNoticeComment,
  NOTICE_COMMENT_MAX_LENGTH,
} from "../api/noticeCommentApi";
import { useAuth } from "../context/AuthContext";
import { isMyComment } from "../utils/commentOwnership";
import "./NoticeComments.css";

const PAGE_SIZE = 20;

/**
 * 공지사항 댓글 섹션. GitHub PR #105(이슈 #104)로 구현된 백엔드 API 연동.
 * NoticeDetailPage에서 사용 — 제출물 댓글(SubmissionComments)과 달리 공지는 전체 공개라
 * 로그인한 누구나(학생/관리자 구분 없이) 댓글을 읽고 쓸 수 있다. 그래서 이 컴포넌트에는
 * "제출 완료 후에만 보인다" 같은 조건이 없다 — 공지 상세 화면이면 항상 노출한다.
 *
 * 내 댓글 판별은 utils/commentOwnership.isMyComment 사용 — authorId → authorStudentNumber →
 * authorName 순으로 비교한다. 현재 백엔드 응답에는 authorName만 있어 이름 폴백이 동작하므로
 * 동명이인 오판 가능성이 있다. 백엔드가 authorId(또는 authorStudentNumber)를 추가하면 자동 해결.
 */
function NoticeComments({ noticeId }) {
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
        const data = await getNoticeComments(noticeId, { page: targetPage, size: PAGE_SIZE });
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
    [noticeId]
  );

  useEffect(() => {
    if (!noticeId) return;
    fetchComments(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeId]);

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
    if (trimmed.length > NOTICE_COMMENT_MAX_LENGTH) {
      setPostError(`댓글은 최대 ${NOTICE_COMMENT_MAX_LENGTH}자까지 입력할 수 있습니다.`);
      return;
    }
    setIsPosting(true);
    setPostError("");
    try {
      const created = await createNoticeComment(noticeId, trimmed);
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
      const updated = await updateNoticeComment(commentId, trimmed);
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
      await deleteNoticeComment(commentId);
      setComments((prev) => prev.filter((c) => c.commentId !== commentId));
    } catch (err) {
      alert(err.message ?? "댓글 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="notice-comments">
      <p className="notice-comments__label">댓글{comments.length > 0 && ` (${comments.length})`}</p>

      {isLoading && comments.length === 0 && <p className="notice-comments__state">불러오는 중...</p>}
      {!isLoading && error && comments.length === 0 && (
        <p className="notice-comments__state notice-comments__state--error">{error}</p>
      )}
      {!isLoading && !error && comments.length === 0 && (
        <p className="notice-comments__state">아직 댓글이 없습니다.</p>
      )}

      {comments.length > 0 && (
        <ul className="notice-comments__list">
          {comments.map((comment) => {
            const isMine = isMyComment(comment, user);
            const canEdit = isMine;
            const canDelete = isMine || isAdmin;
            const isEditing = editingId === comment.commentId;

            return (
              <li key={comment.commentId} className="notice-comment">
                <div className="notice-comment__head">
                  <span className="notice-comment__author">
                    {comment.authorName}
                    <span
                      className={`notice-comment__role ${
                        comment.authorRole === "ADMIN" ? "is-admin" : "is-student"
                      }`}
                    >
                      {comment.authorRole === "ADMIN" ? "관리자" : "학생"}
                    </span>
                  </span>
                  <span className="notice-comment__date">{formatDateTime(comment.createdAt)}</span>
                </div>

                {isEditing ? (
                  <div className="notice-comment__edit">
                    <textarea
                      className="notice-comments__textarea"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      maxLength={NOTICE_COMMENT_MAX_LENGTH}
                      disabled={isSavingEdit}
                    />
                    <div className="notice-comment__edit-actions">
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
                    <p className="notice-comment__text">{comment.content}</p>
                    {(canEdit || canDelete) && (
                      <div className="notice-comment__actions">
                        {canEdit && (
                          <button
                            type="button"
                            className="notice-comment__action-btn"
                            onClick={() => startEdit(comment)}
                          >
                            수정
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="notice-comment__action-btn notice-comment__action-btn--danger"
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
        <button type="button" className="notice-comments__more-btn" onClick={handleLoadMore}>
          이전 댓글 더 보기
        </button>
      )}

      <div className="notice-comments__form">
        <textarea
          className="notice-comments__textarea"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="댓글을 입력하세요"
          maxLength={NOTICE_COMMENT_MAX_LENGTH}
          disabled={isPosting}
        />
        <div className="notice-comments__form-foot">
          <span className="notice-comments__counter">
            {newContent.length} / {NOTICE_COMMENT_MAX_LENGTH}
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

export default NoticeComments;
