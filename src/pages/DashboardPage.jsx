import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getNotices, getUnreadNoticeCount } from "../api/noticeApi";
import { getAssignments, getMySubmissions } from "../api/assignmentApi";
import { getMemberApplications } from "../api/adminMemberApi";
import AppLayout from "../components/AppLayout";
import "./DashboardPage.css";

const RECENT_NOTICES_SIZE = 5;
const UPCOMING_ASSIGNMENTS_LIMIT = 5;
// 다가오는 과제를 계산하려면 전체 과제/제출 내역이 필요하다. 다른 화면(AssignmentListPage 등)과
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

  const fetchUpcomingAssignments = useCallback(async () => {
    if (isAdmin) return;
    setAssignmentsLoading(true);
    try {
      const [assignmentsData, submissionsData] = await Promise.all([
        getAssignments({ page: 0, size: FETCH_ALL_SIZE }),
        getMySubmissions({ page: 0, size: FETCH_ALL_SIZE }),
      ]);
      const assignments = Array.isArray(assignmentsData) ? assignmentsData : assignmentsData.content ?? [];
      const submissions = Array.isArray(submissionsData) ? submissionsData : submissionsData.content ?? [];
      const submittedIds = new Set(submissions.map((s) => s.assignmentId));

      const notSubmitted = assignments.filter((a) => !submittedIds.has(a.assignmentId));
      const stillOpen = notSubmitted.filter((a) => {
        const isPastDue = !!a.dueAt && new Date() > new Date(a.dueAt);
        return !isPastDue || a.allowLateSubmission;
      });
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
      <p className="page-subtitle">
        학번 {user?.studentNumber} · {isAdmin ? "관리자" : "학생"}
      </p>

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
