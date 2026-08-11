import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getNoticeDetail } from "../api/noticeApi";
import AppLayout from "../components/AppLayout";
import "./NoticeDetailPage.css";

function NoticeDetailPage() {
  const { noticeId } = useParams();
  const [notice, setNotice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
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
    };

    fetchDetail();
  }, [noticeId]);

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
          <h1 className="notice-detail__title">{notice.title}</h1>
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
