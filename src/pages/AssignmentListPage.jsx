import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { getAssignments } from "../api/assignmentApi";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import "./AssignmentListPage.css";
import "./AdminWritePage.css";
// 제출완료/미제출/지각제출 통계 타일 + 상태 필터 탭 스타일(.admin-submissions__*)을
// AdminSubmissionsPage와 공유해서 재사용한다(디자인 톤 통일 + 중복 CSS 방지).
import "./AdminSubmissionsPage.css";

const PAGE_SIZE = 10;
// 제출완료/미제출/지각제출 통계와 상태 필터 탭을 정확히 계산하려면 페이지 단위가 아니라
// 전체 과제 목록이 필요하다. 백엔드에 검색어 파라미터도 없어서 어차피 넉넉히 한 번에 받아
// 클라이언트에서 검색/필터/페이지네이션을 모두 처리한다.
const FETCH_ALL_SIZE = 200;

const STATUS_META = {
  progress: { label: "진행중", className: "is-progress" },
  submitted: { label: "제출완료", className: "is-submitted" },
  late: { label: "지각제출", className: "is-late" },
  closed: { label: "마감", className: "is-closed" },
};

const STATUS_TABS = [
  { key: "all", label: "전체" },
  { key: "submitted", label: "제출완료" },
  { key: "not_submitted", label: "미제출" },
  { key: "late", label: "지각제출" },
];

/**
 * 과제 목록. 명세서 23번 API(GET /api/v1/assignments) 연동.
 *
 * 백엔드가 STUDENT로 조회할 때 과제 항목마다 내 제출 상태(submissionStatus: IN_PROGRESS /
 * NOT_SUBMITTED / SUBMITTED / LATE)를 함께 내려주므로, 상태 배지(진행중/제출완료/지각제출/마감)는
 * 이 값을 그대로 매핑해서 쓴다. 예전에는 GET /api/v1/members/me/submissions를 별도로 불러와
 * assignmentId 기준으로 매칭해 프론트에서 직접 계산했는데, 그 방식은 해당 API가 기본적으로
 * "내가 제출한 것만" 내려준다는 전제로 짜여 있어서 — 이제 미제출 과제까지 함께 내려오도록
 * API가 바뀌면서 모든 과제가 항상 "제출완료"로 잘못 표시되는 문제가 있었다. 백엔드가 이미
 * 계산해서 내려주는 상태를 그대로 쓰는 것으로 바꿔서 이 문제와 중복 계산 로직을 함께 제거했다.
 * ADMIN으로 조회하면 submissionStatus가 null로 내려오므로, 관리자 화면에서는 마감 여부만으로
 * 배지를 계산한다(관리자는 제출자가 아니라 개인 제출 상태가 없기 때문).
 *
 * 학생 화면에서는 "어떤 과제를 제출했고 어떤 과제를 안 냈는지"를 한눈에 볼 수 있도록
 * 제출완료/미제출/지각제출 통계 타일과 상태 필터 탭을 추가로 보여준다(AdminSubmissionsPage의
 * 통계/탭 UX를 학생 개인 관점으로 재사용). 관리자는 본인이 제출하는 입장이 아니고 이미
 * AdminSubmissionsPage에서 과제별 제출 현황(전체 학생 대상)을 보므로 이 UI는 노출하지 않는다.
 *
 * 첨부파일 업로드/제출 기능 자체는 상세 화면(AssignmentDetailPage)에서 처리한다.
 */
function AssignmentListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [assignments, setAssignments] = useState([]);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, activeTab]);

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const assignmentsData = await getAssignments({ page: 0, size: FETCH_ALL_SIZE });
      // 공지 목록과 마찬가지로 응답이 배열 단독인지 페이지네이션 객체인지
      // 백엔드와 확정되지 않아 둘 다 방어적으로 처리한다.
      const list = Array.isArray(assignmentsData) ? assignmentsData : assignmentsData.content ?? [];
      setAssignments(list);
    } catch (err) {
      setError(err.message ?? "과제 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // 과제별 상태 배지 + 필터 탭용 상태 키(submitted/late/not_submitted)를 한 번에 계산한다.
  const categorized = useMemo(() => {
    return assignments.map((a) => {
      const meta = resolveStatusMeta(a);
      const statusKey = resolveStatusKey(a);
      return { ...a, meta, statusKey };
    });
  }, [assignments]);

  // 통계 타일은 검색어와 무관하게 "전체 과제 기준" 현황을 보여준다.
  const stats = useMemo(() => {
    const result = { submitted: 0, not_submitted: 0, late: 0 };
    categorized.forEach((a) => {
      result[a.statusKey] += 1;
    });
    return result;
  }, [categorized]);

  const filtered = useMemo(() => {
    const keyword = searchTerm.toLowerCase();
    return categorized.filter((a) => {
      const matchesTab = activeTab === "all" || a.statusKey === activeTab;
      const matchesSearch = !keyword || a.title?.toLowerCase().includes(keyword);
      return matchesTab && matchesSearch;
    });
  }, [categorized, activeTab, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedAssignments = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const subtitle = searchTerm
    ? `'${searchTerm}' 검색 결과 ${filtered.length}건`
    : "진행 중인 과제와 제출 상태를 확인하세요";

  return (
    <AppLayout>
      <div className="assignment-page__header">
        <div>
          <h1 className="assignment-page__title">과제</h1>
          <p className="assignment-page__subtitle">{subtitle}</p>
        </div>
        {isAdmin && (
          <Link to="/admin/assignments/new" className="page-header-add-btn">
            + 새 과제 등록
          </Link>
        )}
      </div>

      {!isAdmin && !isLoading && !error && assignments.length > 0 && (
        <div className="admin-submissions__stats">
          <div className="admin-submissions__stat">
            <p className="admin-submissions__stat-label">제출완료</p>
            <p className="admin-submissions__stat-value">{stats.submitted}</p>
          </div>
          <div className="admin-submissions__stat">
            <p className="admin-submissions__stat-label">미제출</p>
            <p className="admin-submissions__stat-value">{stats.not_submitted}</p>
          </div>
          <div className="admin-submissions__stat admin-submissions__stat--late">
            <p className="admin-submissions__stat-label">지각제출</p>
            <p className="admin-submissions__stat-value">{stats.late}</p>
          </div>
        </div>
      )}

      <div className="list-toolbar">
        {!isAdmin && !isLoading && !error && assignments.length > 0 && (
          <div className="admin-submissions__tabs">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`admin-submissions__tab ${activeTab === tab.key ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
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
            placeholder="과제 제목으로 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {isLoading && <p className="assignment-page__state">불러오는 중...</p>}

      {!isLoading && error && (
        <p className="assignment-page__state assignment-page__state--error">{error}</p>
      )}

      {!isLoading && !error && assignments.length === 0 && (
        <p className="assignment-page__state">등록된 과제가 없습니다.</p>
      )}

      {!isLoading && !error && assignments.length > 0 && filtered.length === 0 && (
        <p className="assignment-page__state">
          {searchTerm ? "검색 결과가 없습니다." : "해당 상태의 과제가 없습니다."}
        </p>
      )}

      {!isLoading && !error && pagedAssignments.length > 0 && (
        <ul className="assignment-list">
          {pagedAssignments.map((a) => (
            <li key={a.assignmentId}>
              <Link to={`/assignments/${a.assignmentId}`} className="assignment-item">
                <div className="assignment-item__main">
                  <span className="assignment-item__title">{a.title}</span>
                  <span className="assignment-item__due">마감 {formatDateTime(a.dueAt)}</span>
                </div>
                <span className={`assignment-item__status ${a.meta.className}`}>{a.meta.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && !error && filtered.length > 0 && totalPages > 1 && (
        <div className="assignment-page__pagination">
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

// 관리자 조회는 submissionStatus가 내려오지 않으므로(null), 마감 여부만으로 배지를 계산한다.
function resolveStatusMeta(assignment) {
  switch (assignment.submissionStatus) {
    case "SUBMITTED":
      return STATUS_META.submitted;
    case "LATE":
      return STATUS_META.late;
    case "IN_PROGRESS":
      return STATUS_META.progress;
    case "NOT_SUBMITTED":
      return STATUS_META.closed;
    default: {
      const isPastDue = !!assignment.dueAt && new Date() > new Date(assignment.dueAt);
      if (isPastDue && !assignment.allowLateSubmission) {
        return STATUS_META.closed;
      }
      return STATUS_META.progress;
    }
  }
}

// 통계 타일/필터 탭은 "제출완료" / "지각제출" / "미제출"(진행중 + 마감을 합친 것) 세 갈래만 구분한다.
function resolveStatusKey(assignment) {
  if (assignment.submissionStatus === "SUBMITTED") return "submitted";
  if (assignment.submissionStatus === "LATE") return "late";
  return "not_submitted";
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

export default AssignmentListPage;
