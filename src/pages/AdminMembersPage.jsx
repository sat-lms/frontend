import { useState, useEffect, useCallback } from "react";
import { getAllMembers, getMemberDetail, updateMemberRole } from "../api/adminMemberApi";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import "./AdminWritePage.css";
import "./AdminApprovalsPage.css";
import "./AdminSubmissionsPage.css"; // 상세 모달(.admin-submissions-modal__*) 스타일 재사용
import "./AdminMembersPage.css";

const PAGE_SIZE = 20;

const ROLE_TABS = [
  { value: undefined, label: "전체" },
  { value: "STUDENT", label: "학생" },
  { value: "ADMIN", label: "관리자" },
];

const STATUS_OPTIONS = [
  { value: "", label: "전체 상태" },
  { value: "PENDING", label: "대기중" },
  { value: "APPROVED", label: "승인됨" },
  { value: "REJECTED", label: "거절됨" },
  { value: "WITHDRAWN", label: "탈퇴" },
];

const STATUS_LABEL = {
  PENDING: "대기중",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
  WITHDRAWN: "탈퇴",
};

/**
 * 전체 회원 관리 화면 (관리자 전용). 명세서 11/12/13번 API 연동.
 * GET /api/v1/admin/members (역할/상태/검색어 필터 목록) +
 * GET /api/v1/admin/members/{memberId} (상세 - 심사 기록 포함, 모달로 표시) +
 * PATCH /api/v1/admin/members/{memberId}/role (역할 변경).
 *
 * 명세서 13번 자체가 "필수 요구사항 외 확장 API"로 명시돼 있어 화면도 최소한의 조작
 * (역할 토글 + 상세 확인)만 제공한다. 승인/거절은 이 화면이 아니라 회원가입 승인
 * 화면(AdminApprovalsPage, 명세서 8/9/10번)의 책임이라 여기서는 다루지 않는다.
 */
function AdminMembersPage() {
  const { user: currentUser } = useAuth();

  const [role, setRole] = useState(undefined);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);

  const [members, setMembers] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [changingRoleId, setChangingRoleId] = useState(null);

  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getAllMembers({
        role,
        status: status || undefined,
        keyword: keyword || undefined,
        page,
        size: PAGE_SIZE,
      });
      const list = Array.isArray(data) ? data : data.content ?? [];
      setMembers(list);
      setTotalPages(Array.isArray(data) ? 1 : data.totalPages ?? 1);
    } catch (err) {
      setError(err.message ?? "회원 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [role, status, keyword, page]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleChangeRoleTab = (value) => {
    if (value === role) return;
    setRole(value);
    setPage(0);
  };

  const handleChangeStatus = (e) => {
    setStatus(e.target.value);
    setPage(0);
  };

  const handleToggleRole = async (member) => {
    const nextRole = member.role === "ADMIN" ? "STUDENT" : "ADMIN";
    const isSelf = currentUser?.id != null && String(currentUser.id) === String(member.memberId);

    const confirmMessage = isSelf
      ? "본인의 관리자 권한을 해제할까요? 이후 관리자 전용 화면에 접근할 수 없게 됩니다."
      : `${member.name}님의 역할을 ${nextRole === "ADMIN" ? "관리자" : "학생"}(으)로 변경할까요?`;
    if (!window.confirm(confirmMessage)) return;

    setChangingRoleId(member.memberId);
    try {
      await updateMemberRole(member.memberId, nextRole);
      setMembers((prev) => prev.map((m) => (m.memberId === member.memberId ? { ...m, role: nextRole } : m)));
    } catch (err) {
      alert(err.message ?? "역할 변경에 실패했습니다.");
    } finally {
      setChangingRoleId(null);
    }
  };

  const openDetail = async (memberId) => {
    setDetailId(memberId);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const data = await getMemberDetail(memberId);
      setDetail(data);
    } catch (err) {
      setDetailError(err.message ?? "회원 정보를 불러오지 못했습니다.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
    setDetailError("");
  };

  return (
    <AppLayout>
      <h1 className="page-title">회원 관리</h1>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        전체 회원을 조회하고 역할을 관리하세요
      </p>

      <div className="admin-approvals__tabs">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`admin-approvals__tab ${role === tab.value ? "is-active" : ""}`}
            onClick={() => handleChangeRoleTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="list-toolbar">
        <select className="admin-members__status-select" value={status} onChange={handleChangeStatus}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="list-search" style={{ marginLeft: "auto" }}>
          <span className="list-search__icon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="16.65" y1="16.65" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            className="list-search__input"
            placeholder="학번 또는 이름으로 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {isLoading && <p className="admin-approvals__state">불러오는 중...</p>}
      {!isLoading && error && <p className="admin-approvals__state admin-approvals__state--error">{error}</p>}
      {!isLoading && !error && members.length === 0 && (
        <div className="page-empty-card">해당하는 회원이 없습니다.</div>
      )}

      {!isLoading && !error && members.length > 0 && (
        <ul className="admin-approvals-list">
          {members.map((m) => (
            <li key={m.memberId} className="admin-approvals-item">
              <div className="admin-approvals-item__main">
                <span className="admin-approvals-item__name">{m.name}</span>
                <span className="admin-approvals-item__number">{m.studentNumber}</span>
                <span
                  className={`admin-members__badge ${
                    m.role === "ADMIN" ? "admin-members__badge--admin" : "admin-members__badge--student"
                  }`}
                >
                  {m.role === "ADMIN" ? "관리자" : "학생"}
                </span>
                <span className={`admin-members__badge admin-members__badge--status-${(m.status ?? "").toLowerCase()}`}>
                  {STATUS_LABEL[m.status] ?? m.status}
                </span>
                <span className="admin-approvals-item__date">가입일 {formatDate(m.createdAt)}</span>
              </div>
              <div className="admin-approvals-item__actions">
                <button type="button" className="admin-detail-actions__btn" onClick={() => openDetail(m.memberId)}>
                  상세보기
                </button>
                {m.status !== "WITHDRAWN" && (
                  <button
                    type="button"
                    className="admin-detail-actions__btn"
                    onClick={() => handleToggleRole(m)}
                    disabled={changingRoleId === m.memberId}
                  >
                    {changingRoleId === m.memberId ? "변경 중..." : m.role === "ADMIN" ? "학생으로 변경" : "관리자로 지정"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && !error && totalPages > 1 && (
        <div className="admin-approvals__pagination">
          <button disabled={page === 0} onClick={() => setPage((prev) => prev - 1)}>
            이전
          </button>
          <span>
            {page + 1} / {totalPages}
          </span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((prev) => prev + 1)}>
            다음
          </button>
        </div>
      )}

      {detailId && (
        <div className="admin-submissions-modal__backdrop" onClick={closeDetail}>
          <div className="admin-submissions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-submissions-modal__head">
              <h2 className="admin-submissions-modal__title">
                {detailLoading ? "불러오는 중..." : detail?.name ?? "회원 상세"}
              </h2>
              <button type="button" className="admin-submissions-modal__close" onClick={closeDetail} aria-label="닫기">
                ×
              </button>
            </div>

            {detailLoading && <p className="admin-approvals__state">불러오는 중...</p>}
            {!detailLoading && detailError && (
              <p className="admin-approvals__state admin-approvals__state--error">{detailError}</p>
            )}

            {!detailLoading && !detailError && detail && (
              <div className="admin-members-detail">
                <div className="admin-members-detail__row">
                  <span>학번</span>
                  <strong>{detail.studentNumber}</strong>
                </div>
                <div className="admin-members-detail__row">
                  <span>역할</span>
                  <strong>{detail.role === "ADMIN" ? "관리자" : "학생"}</strong>
                </div>
                <div className="admin-members-detail__row">
                  <span>상태</span>
                  <strong>{STATUS_LABEL[detail.status] ?? detail.status}</strong>
                </div>
                <div className="admin-members-detail__row">
                  <span>가입일</span>
                  <strong>{formatDate(detail.createdAt)}</strong>
                </div>
                {(detail.review?.action ?? detail.action) && (
                  <>
                    <div className="admin-members-detail__row">
                      <span>심사 결과</span>
                      <strong>{(detail.review?.action ?? detail.action) === "REJECTED" ? "거절" : "승인"}</strong>
                    </div>
                    {(detail.review?.rejectionReason ?? detail.rejectionReason) && (
                      <div className="admin-members-detail__row">
                        <span>거절 사유</span>
                        <strong>{detail.review?.rejectionReason ?? detail.rejectionReason}</strong>
                      </div>
                    )}
                    <div className="admin-members-detail__row">
                      <span>처리일시</span>
                      <strong>{formatDate(detail.review?.reviewedAt ?? detail.reviewedAt)}</strong>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
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

export default AdminMembersPage;
