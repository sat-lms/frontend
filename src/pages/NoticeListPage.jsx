import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getNotices, getUnreadNoticeCount } from "../api/noticeApi";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import "./NoticeListPage.css";
import "./AdminWritePage.css";

const PAGE_SIZE = 10;
// 검색 중에는 서버 페이지네이션 대신 넉넉히 한 번에 가져와 제목 기준으로 클라이언트에서 필터링한다
// (백엔드 GET /api/v1/notices에 검색어 파라미터가 없어서 클라이언트 검색으로 처리).
const SEARCH_FETCH_SIZE = 200;

function NoticeListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [notices, setNotices] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // 타이핑할 때마다 요청을 보내지 않도록 300ms 디바운스 후 실제 검색어로 반영한다.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, unreadOnly]);

  const fetchNotices = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      if (searchTerm) {
        const data = await getNotices({ page: 0, size: SEARCH_FETCH_SIZE, unreadOnly });
        const list = Array.isArray(data) ? data : data.content ?? [];
        const keyword = searchTerm.toLowerCase();
        setNotices(list.filter((n) => n.title?.toLowerCase().includes(keyword)));
        setTotalPages(1);
        return;
      }

      const data = await getNotices({ page, size: PAGE_SIZE, unreadOnly });
      // 명세서상 응답 형태가 페이지네이션 객체(content/totalPages)인지
      // 배열 단독인지 백엔드와 확정되지 않아, 둘 다 방어적으로 처리한다.
      if (Array.isArray(data)) {
        setNotices(data);
        setTotalPages(1);
      } else {
        setNotices(data.content ?? []);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (err) {
      setError(err.message ?? "공지 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [page, unreadOnly, searchTerm]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadNoticeCount();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // 안 읽은 개수는 부가 정보라 실패해도 화면 전체를 막지 않는다
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const handleToggleUnreadOnly = () => {
    setUnreadOnly((prev) => !prev);
  };

  const subtitle = searchTerm
    ? `'${searchTerm}' 검색 결과 ${notices.length}건`
    : `학과 및 시스템 공지를 확인하세요${unreadCount > 0 ? ` · 안 읽은 공지 ${unreadCount}건` : ""}`;

  const emptyMessage = searchTerm
    ? "검색 결과가 없습니다."
    : unreadOnly
    ? "안 읽은 공지가 없습니다."
    : "등록된 공지가 없습니다.";

  return (
    <AppLayout>
      <div className="notice-page__header">
        <div>
          <h1 className="notice-page__title">공지사항</h1>
          <p className="notice-page__subtitle">{subtitle}</p>
        </div>

        {isAdmin && (
          <Link to="/admin/notices/new" className="page-header-add-btn">
            + 새 공지 작성
          </Link>
        )}
      </div>

      <div className="list-toolbar">
        <label className="notice-page__filter">
          <input type="checkbox" checked={unreadOnly} onChange={handleToggleUnreadOnly} />
          안 읽은 공지만
        </label>

        <div className="list-search">
          <span className="list-search__icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="16.65" y1="16.65" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            className="list-search__input"
            placeholder="공지 제목으로 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {isLoading && <p className="notice-page__state">불러오는 중...</p>}

      {!isLoading && error && (
        <p className="notice-page__state notice-page__state--error">{error}</p>
      )}

      {!isLoading && !error && notices.length === 0 && (
        <p className="notice-page__state">{emptyMessage}</p>
      )}

      {!isLoading && !error && notices.length > 0 && (
        <ul className="notice-list">
          {notices.map((notice) => (
            <li key={notice.noticeId}>
              <Link to={`/notices/${notice.noticeId}`} className="notice-item">
                {notice.isPinned && <span className="notice-item__pin">고정</span>}
                {!notice.isRead && <span className="notice-item__dot" aria-label="안 읽음" />}
                <span className="notice-item__title">{notice.title}</span>
                <span className="notice-item__author">{notice.authorName}</span>
                <span className="notice-item__date">{formatDate(notice.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && !error && !searchTerm && totalPages > 1 && (
        <div className="notice-page__pagination">
          <button disabled={page === 0} onClick={() => setPage((prev) => prev - 1)}>
            이전
          </button>
          <span>
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((prev) => prev + 1)}
          >
            다음
          </button>
        </div>
      )}
    </AppLayout>
  );
}

function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default NoticeListPage;
