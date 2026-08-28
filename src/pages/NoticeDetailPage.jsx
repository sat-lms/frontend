import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getNoticeDetail, deleteNotice } from "../api/noticeApi";
import {
  getNoticeAttachments,
  getNoticeAttachmentDownloadUrl,
  deleteNoticeAttachment,
} from "../api/noticeAttachmentApi";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import "./NoticeDetailPage.css";
import "./AdminWritePage.css";
import "./AssignmentDetailPage.css"; // 첨부파일 칩(.assignment-file-chip) 스타일 재사용

function NoticeDetailPage() {
  const { noticeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [notice, setNotice] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      // 첨부파일 목록 조회는 백엔드에 아직 없을 수 있는 엔드포인트라(getNoticeAttachments가
      // 404를 조용히 [] 로 처리함) 공지 본문 조회와 분리해서 병렬로 불러온다 — 첨부파일 쪽에서
      // 문제가 생겨도 본문 조회에는 영향이 없게 한다.
      const [data, attachmentsData] = await Promise.all([
        getNoticeDetail(noticeId),
        getNoticeAttachments(noticeId).catch(() => []),
      ]);
      setNotice(data);
      setAttachments(attachmentsData);
    } catch (err) {
      setError(err.status === 404 ? "존재하지 않는 공지입니다." : "공지를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [noticeId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleDelete = async () => {
    if (!window.confirm("이 공지를 삭제할까요? 삭제하면 되돌릴 수 없습니다.")) return;
    setIsDeleting(true);
    try {
      await deleteNotice(noticeId);
      navigate("/notices");
    } catch (err) {
      alert(err.message ?? "삭제에 실패했습니다.");
      setIsDeleting(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId) => {
    try {
      const { downloadUrl } = await getNoticeAttachmentDownloadUrl(attachmentId);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch {
      alert("파일 다운로드 링크를 가져오지 못했습니다.");
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("이 첨부파일을 삭제할까요?")) return;
    setDeletingAttachmentId(attachmentId);
    try {
      await deleteNoticeAttachment(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.attachmentId !== attachmentId));
    } catch (err) {
      alert(err.message ?? "첨부파일 삭제에 실패했습니다.");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  return (
    <AppLayout>
      <Link to="/notices" className="notice-detail-page__back">
        ← 공지사항 목록으로
      </Link>

      {isLoading && <p className="notice-detail-page__state">불러오는 중...</p>}

      {!isLoading && error && (
        <p className="notice-detail-page__state notice-detail-page__state--error">{error}</p>
      )}

      {!isLoading && !error && notice && (
        <article className="notice-detail">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div>
              {notice.isPinned && <span className="notice-detail__badge">고정 공지</span>}
              <h1 className="notice-detail__title">{notice.title}</h1>
            </div>
            {isAdmin && (
              <div className="admin-detail-actions">
                <Link to={`/admin/notices/${noticeId}/edit`} className="admin-detail-actions__btn">
                  수정
                </Link>
                <button
                  type="button"
                  className="admin-detail-actions__btn admin-detail-actions__btn--danger"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
            )}
          </div>
          <p className="notice-detail__meta">
            {notice.authorName} · {formatDate(notice.createdAt)}
          </p>
          <div className="notice-detail__content">{notice.content}</div>

          {attachments.length > 0 && (
            <div className="assignment-detail__refs">
              <p className="assignment-detail__refs-label">첨부파일</p>
              <div className="assignment-detail__refs-list">
                {attachments.map((file) => (
                  <span key={file.attachmentId} className="assignment-file-chip">
                    <button
                      type="button"
                      className="assignment-file-chip__name"
                      onClick={() => handleDownloadAttachment(file.attachmentId)}
                    >
                      {file.originalName}
                      {file.formattedSize && (
                        <span className="assignment-file-chip__size"> · {file.formattedSize}</span>
                      )}
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className="assignment-file-chip__remove"
                        onClick={() => handleDeleteAttachment(file.attachmentId)}
                        disabled={deletingAttachmentId === file.attachmentId}
                        aria-label={`${file.originalName} 삭제`}
                        title="첨부파일 삭제"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>
      )}
    </AppLayout>
  );
}

function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default NoticeDetailPage;
