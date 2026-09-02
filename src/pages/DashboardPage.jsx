import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getNotices, getUnreadNoticeCount } from "../api/noticeApi";
import { getAssignments } from "../api/assignmentApi";
import { getMemberApplications } from "../api/adminMemberApi";
import AppLayout from "../components/AppLayout";
import "./DashboardPage.css";

const RECENT_NOTICES_SIZE = 5;
const UPCOMING_ASSIGNMENTS_LIMIT = 5;
// 다가오는 과제를 계산하려면 전체 과제 목록이 필요하다. 다른 화면(AssignmentListPage 등)과
// 동일하게 데이터가 아주 많지는 않을 거라 보고 한 번에 넉넉히 가져와 클라이언트에서 계산한다.
const FETCH_ALL_SIZE = 200;

/**
 * 로그인 후 진입하는 홈 화면.
 * 명지대 LMS 홈(할일 목록 + D-day 배지, 공지 미리보기)의 레이아웃 아이디어를 참고했다.
 * 학생: 안 읽은 공지 수 / 다가오는 과제(미제출·마감 임박순) / 최근 공지 미리보기.
 * 관리자: 대기중인 가입 신청 수 / 등록된 과제 수 + 빠른 작업 바로가기 / 최근 공지 미리보기.
 */
function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [recentNotices, setRecentNotices] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [noticesLoading, setNoticesLoading] = useState(true);

  const [upcoming, setUpcoming] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(!isAdmin);

  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [totalAssignmentCount, setTotalAssignmentCount] = useState(0);
  const [adminStatsLoading, setAdminStatsLoading] = useState(isAdmin);

  const fetchRecentNotices = useCallback(async () => {
    setNoticesLoading(true);
    try {
      const [noticesData, unread] = await Promise.all([
        getNotices({ page: 0, size: RECENT_NOTICES_SIZE }),
        getUnreadNoticeCount(),
      ]);
      const list = Array.isArray(noticesData) ? noticesData : noticesData.content ?? [];
      setRecentNotices(list);
      setUnreadCount(unread.unreadCount ?? 0);
    } catch {
      setRecentNotices([]);
    } finally {
      setNoticesLoading(false);
    }
  }, []);

  // "다가오는 과제"는 GET /api/v1/assignments가 STUDENT 조회 시 함께 내려주는
  // submissionStatus로 계산한다. IN_PROGRESS는 "아직 제출 안 했지만 제출 가능한" 과제를
  // 뜻하고, 마감이 지났어도 지각 제출이 허용되면 여기 포함되므로 기존에 프론트에서 직접
  // 계산하던 "미제출 + (마감 전이거나 지각 허용)" 조건과 동일하다.
  //
  // 예전에는 GET /api/v1/members/me/submissions를 별도로 불러와 제출된 assignmentId를
  // 걸러내는 방식이었는데, 그 API가 기본적으로 "내가 제출한 것만" 내려준다는 전제로 짜여
  // 있어서 — 이제 미제출 과제까지 함께 내려오도록 API가 바뀌면서 모든 과제가 "제출됨"으로
  // 걸러져 이 위젯이 항상 빈 목록으로 나오는 문제가 있었다. 백엔드가 이미 계산해서 내려주는
  // 상태를 그대로 쓰는 것으로 바꿔서 이 문제와 중복 계산 로직을 함께 제거했다.
  const fetchUpcomingAssignments = useCallback(async () => {
    if (isAdmin) return;
    setAssignmentsLoading(true);
    try {
      const assignmentsData = await getAssignments({ page: 0, size: FETCH_ALL_SIZE });
      const assignments = Array.isArray(assignmentsData) ? assignmentsData : assignmentsData.content ?? [];
      const stillOpen = assignments.filter((a) => a.submissionStatus === "IN_PROGRESS");
      stillOpen.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
      setUpcoming(stillOpen.slice(0, UPCOMING_ASSIGNMENTS_LIMIT));
    } catch {
      setUpcoming([]);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [isAdmin]);

  const fetchAdminStats = useCallback(async () => {
    if (!isAdmin) return;
    setAdminStatsLoading(true);
    try {
      const [applications, assignmentsData] = await Promise.all([
        getMemberApplications({ status: "PENDING", page: 0, size: 1 }),
        getAssignments({ page: 0, size: 1 }),
      ]);
      setPendingApprovalCount(applications.totalElements ?? applications.content?.length ?? 0);
      setTotalAssignmentCount(
        Array.isArray(assignmentsData)
          ? assignmentsData.length
          : assignmentsData.totalElements ?? assignmentsData.content?.length ?? 0
      );
    } catch {
      setPendingApprovalCount(0);
      setTotalAssignmentCount(0);
    } finally {
      setAdminStatsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchRecentNotices();
  }, [fetchRecentNotices]);

  useEffect(() => {
    fetchUpcomingAssignments();
  }, [fetchUpcomingAssignments]);

  useEffect(() => {
    fetchAdminStats();
  }, [fetchAdminStats]);

  return (
    <AppLayout>
      <h1 className="page-title">안녕하세요, {user?.name}님</h1>

      {isAdmin ? (
        <div className="dashboard__stats">
          <Link to="/admin/approvals" className="dashboard__stat">
            <p className="dashboard__stat-label">대기중인 가입 신청</p>
            <p className="dashboard__stat-value">{adminStatsLoading ? "-" : pendingApprovalCount}</p>
          </Link>
          <Link to="/assignments" className="dashboard__stat">
            <p className="dashboard__stat-label">등록된 과제</p>
            <p className="dashboard__stat-value">{adminStatsLoading ? "-" : totalAssignmentCount}</p>
          </Link>
          <Link to="/notices" className="dashboard__stat">
            <p className="dashboard__stat-label">안 읽은 공지</p>
            <p className="dashboard__stat-value">{noticesLoading ? "-" : unreadCount}</p>
          </Link>
        </div>
      ) : (
        <div className="dashboard__stats">
          <Link to="/notices" className="dashboard__stat">
            <p className="dashboard__stat-label">안 읽은 공지</p>
            <p className="dashboard__stat-value">{noticesLoading ? "-" : unreadCount}</p>
          </Link>
          <Link to="/assignments" className="dashboard__stat">
            <p className="dashboard__stat-label">진행중인 과제</p>
            <p className="dashboard__stat-value">{assignmentsLoading ? "-" : upcoming.length}</p>
          </Link>
        </div>
      )}

      {isAdmin && (
        <div className="dashboard__quick-actions">
          <Link to="/admin/notices/new" className="dashboard__quick-action">
            공지 작성
          </Link>
          <Link to="/admin/assignments/new" className="dashboard__quick-action">
            과제 등록
          </Link>
          <Link to="/admin/approvals" className="dashboard__quick-action">
            회원가입 승인
          </Link>
          <Link to="/admin/submissions" className="dashboard__quick-action">
            과제 제출 현황
          </Link>
        </div>
      )}

      <div className="dashboard__grid">
        {!isAdmin && (
          <section className="dashboard__section">
            <div className="dashboard__section-head">
              <h2 className="dashboard__section-title">다가오는 과제</h2>
              <Link to="/assignments" className="dashboard__section-more">
                전체보기
              </Link>
            </div>
            {assignmentsLoading && <p className="dashboard__section-state">불러오는 중...</p>}
            {!assignmentsLoading && upcoming.length === 0 && (
              <p className="dashboard__section-state">제출할 과제가 없습니다.</p>
            )}
            {!assignmentsLoading && upcoming.length > 0 && (
              <ul className="dashboard__list">
                {upcoming.map((a) => {
                  const dday = ddayLabel(a.dueAt);
                  const isUrgent = dday === "D-DAY" || (dday.startsWith("D-") && Number(dday.slice(2)) <= 1);
                  return (
                    <li key={a.assignmentId}>
                      <Link to={`/assignments/${a.assignmentId}`} className="dashboard-todo">
                        <span className={`dashboard-todo__dday ${isUrgent ? "is-urgent" : ""}`}>{dday}</span>
                        <span className="dashboard-todo__title">{a.title}</span>
                        <span className="dashboard-todo__due">{formatDate(a.dueAt)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <section className="dashboard__section">
          <div className="dashboard__section-head">
            <h2 className="dashboard__section-title">최근 공지</h2>
            <Link to="/notices" className="dashboard__section-more">
              전체보기
            </Link>
          </div>
          {noticesLoading && <p className="dashboard__section-state">불러오는 중...</p>}
          {!noticesLoading && recentNotices.length === 0 && (
            <p className="dashboard__section-state">등록된 공지가 없습니다.</p>
          )}
          {!noticesLoading && recentNotices.length > 0 && (
            <ul className="dashboard__list">
              {recentNotices.map((n) => (
                <li key={n.noticeId}>
                  <Link to={`/notices/${n.noticeId}`} className="dashboard-notice">
                    {n.isPinned && <span className="dashboard-notice__pin">고정</span>}
                    {!n.isRead && <span className="dashboard-notice__dot" aria-label="안 읽음" />}
                    <span className="dashboard-notice__title">{n.title}</span>
                    <span className="dashboard-notice__date">{formatDate(n.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function ddayLabel(dueAt) {
  const due = new Date(dueAt);
  const now = new Date();
  const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDate - nowDate) / 86400000);
  if (diffDays > 0) return `D-${diffDays}`;
  if (diffDays === 0) return "D-DAY";
  return "지각가능";
}

function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

export default DashboardPage;
