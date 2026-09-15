import { useState, useEffect, useCallback } from "react";
import { getAllMembers, updateMemberRole, expelMember } from "../api/adminMemberApi";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import "./AdminWritePage.css";
import "./AdminApprovalsPage.css";
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

// 정렬 옵션. value는 Spring Pageable 형식(`sort=필드,방향`)으로 백엔드에 그대로 전달한다.
const SORT_OPTIONS = [
  { value: "createdAt,desc", label: "가입일 최신순" },
  { value: "createdAt,asc", label: "가입일 오래된순" },
  { value: "studentNumber,asc", label: "학번 오름차순" },
  { value: "studentNumber,desc", label: "학번 내림차순" },
];
const DEFAULT_SORT = SORT_OPTIONS[0].value;

// 백엔드 JPQL에 `order by m.createdAt desc`가 고정돼 있어 Pageable sort가 뒤에 덧붙기만 하고
// 실제로는 적용되지 않는다. 그래서 받은 페이지를 프론트에서 한 번 더 정렬해 토글이 눈에 보이게 한다.
// ⚠️ 페이지 단위 정렬이라 여러 페이지에 걸친 전역 정렬은 백엔드가 order by를 걷어내야 정확해진다.
const sortMembers = (list, sortValue) => {
  const [field, direction] = sortValue.split(",");
  const sign = direction === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const av = a[field] ?? "";
    const bv = b[field] ?? "";
    if (field === "createdAt") {
      return (new Date(av).getTime() - new Date(bv).getTime()) * sign;
    }
    return String(av).localeCompare(String(bv), "ko-KR", { numeric: true }) * sign;
  });
};

const STATUS_LABEL = {
  PENDING: "대기중",
  APPROVED: "승인됨",
  REJECTED: "거절됨",
  WITHDRAWN: "탈퇴",
};

/**
 * 전체 회원 관리 화면 (관리자 전용). 명세서 11/12번 API 연동.
 * GET /api/v1/admin/members (역할/상태/검색어 필터 + 정렬 목록) +
 * PATCH /api/v1/admin/members/{memberId}/role (역할 변경) +
 * DELETE /api/v1/admin/members/{memberId} (승인된 학생 추방, 소프트 삭제).
 *
 * ⚠️ 팀 요청으로 두 가지를 제거했다:
 * 1. "상세보기" 버튼/모달(명세서 13번, 심사 기록 조회) — 이 화면에서는 목록만 보여준다.
 *    GET /api/v1/admin/members/{memberId}(getMemberDetail)는 adminMemberApi.js에 그대로
 *    남아있으니 나중에 다시 필요해지면 재사용할 수 있다.
 * 2. "관리자로 지정" 액션 — 학생을 관리자로 승격시키는 버튼은 더 이상 노출하지 않는다.
 *    기존 관리자를 학생으로 되돌리는 "학생으로 변경"(강등)은 그대로 유지했다 — 요청이
 *    "관리자로 지정 버튼 삭제"였지 강등까지 막아달라는 건 아니었기 때문. 이 화면으로
 *    학생을 관리자로 만들 수 없으니, 그게 필요하면 다른 경로(DB 직접 조작 등)를 써야 한다.
 */
function AdminMembersPage() {
  const { user: currentUser } = useAuth();

  const [role, setRole] = useState(undefined);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [page, setPage] = useState(0);

  const [members, setMembers] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [changingRoleId, setChangingRoleId] = useState(null);
  const [expellingId, setExpellingId] = useState(null);

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
        sort,
        page,
        size: PAGE_SIZE,
      });
      const list = Array.isArray(data) ? data : data.content ?? [];
      setMembers(sortMembers(list, sort));
      setTotalPages(Array.isArray(data) ? 1 : data.totalPages ?? 1);
    } catch (err) {
      setError(err.message ?? "회원 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [role, status, keyword, sort, page]);

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

  const handleChangeSort = (e) => {
    setSort(e.target.value);
    setPage(0);
  };

  // 관리자 → 학생 강등만 이 버튼으로 처리한다 (학생 → 관리자 승격 버튼은 제거됨).
  const handleDemoteToStudent = async (member) => {
    const isSelf = currentUser?.id != null && String(currentUser.id) === String(member.memberId);
    const confirmMessage = isSelf
      ? "본인의 관리자 권한을 해제할까요? 이후 관리자 전용 화면에 접근할 수 없게 됩니다."
      : `${member.name}님의 역할을 학생으로 변경할까요?`;
    if (!window.confirm(confirmMessage)) return;

    setChangingRoleId(member.memberId);
    try {
      await updateMemberRole(member.memberId, "STUDENT");
      setMembers((prev) => prev.map((m) => (m.memberId === member.memberId ? { ...m, role: "STUDENT" } : m)));
    } catch (err) {
      alert(err.message ?? "역할 변경에 실패했습니다.");
    } finally {
      setChangingRoleId(null);
    }
  };

  // 승인된 학생 추방(강제 탈퇴). 백엔드가 자기 자신/다른 ADMIN 추방을 거부하지만,
  // 프론트에서도 APPROVED STUDENT 행에만 버튼을 노출해 불필요한 요청을 막는다.
  const handleExpelMember = async (member) => {
    const confirmMessage = `${member.name}님을 추방할까요? 이 작업은 되돌릴 수 없으며, 이후 로그인이 차단됩니다.`;
    if (!window.confirm(confirmMessage)) return;

    setExpellingId(member.memberId);
    try {
      await expelMember(member.memberId);
      setMembers((prev) =>
        prev.map((m) => (m.memberId === member.memberId ? { ...m, status: "WITHDRAWN" } : m))
      );
    } catch (err) {
      alert(err.message ?? "추방 처리에 실패했습니다.");
    } finally {
      setExpellingId(null);
    }
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
        <select className="admin-members__status-select" value={sort} onChange={handleChangeSort} aria-label="정렬">
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
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
              {m.role === "ADMIN" && m.status !== "WITHDRAWN" && (
                <div className="admin-approvals-item__actions">
                  <button
                    type="button"
                    className="admin-detail-actions__btn"
                    onClick={() => handleDemoteToStudent(m)}
                    disabled={changingRoleId === m.memberId}
                  >
                    {changingRoleId === m.memberId ? "변경 중..." : "학생으로 변경"}
                  </button>
                </div>
              )}
              {m.role === "STUDENT" && m.status === "APPROVED" && (
                <div className="admin-approvals-item__actions">
                  <button
                    type="button"
                    className="admin-detail-actions__btn admin-detail-actions__btn--danger"
                    onClick={() => handleExpelMember(m)}
                    disabled={expellingId === m.memberId}
                  >
                    {expellingId === m.memberId ? "추방 중..." : "추방"}
                  </button>
                </div>
              )}
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
    </AppLayout>
  );
}

function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default AdminMembersPage;
