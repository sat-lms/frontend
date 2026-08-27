import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getNoticeDetail, deleteNotice } from "../api/noticeApi";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import "./NoticeDetailPage.css";
import "./AdminWritePage.css";

function NoticeDetailPage() {
  const { noticeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [notice, setNotice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getNoticeDetail(noticeId);
      setNotice(data);
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
            <h1 className="notice-detail__title">{notice.title}</h1>
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

          {/* TODO: 첨부파일 목록 + Presigned URL 다운로드 (명세서 21번 API) */}
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
