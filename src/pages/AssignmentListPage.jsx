import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getAssignments, getMySubmissions } from "../api/assignmentApi";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import "./AssignmentListPage.css";
import "./AdminWritePage.css";

const PAGE_SIZE = 10;
// 과제 목록과 별개로 "내 제출 내역"을 한 번에 가져와 과제별 상태를 계산한다.
// 학생 한 명의 전체 제출 건수가 아주 많지는 않을 거라 보고 넉넉하게 잡았다 (N+1 조회 방지).
const SUBMISSIONS_FETCH_SIZE = 200;

const STATUS_META = {
  progress: { label: "진행중", className: "is-progress" },
  submitted: { label: "제출완료", className: "is-submitted" },
  late: { label: "지각제출", className: "is-late" },
  closed: { label: "마감", className: "is-closed" },
};

/**
 * 과제 목록. 명세서 23번 API(GET /api/v1/assignments) 연동.
 *
 * 백엔드가 과제 목록 응답에 "내 제출 상태"를 함께 내려주지 않기 때문에(N+1 방지 목적으로
 * 의도적으로 분리된 설계), 내 제출 내역 목록(GET /api/v1/members/me/submissions)을 같이 불러와서
 * assignmentId 기준으로 매칭해 상태 배지(진행중/제출완료/지각제출/마감)를 클라이언트에서 계산한다.
 * 첨부파일 업로드/제출 기능 자체는 상세 화면(AssignmentDetailPage)에서 처리한다.
 */
function AssignmentListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [assignments, setAssignments] = useState([]);
  const [submissionByAssignmentId, setSubmissionByAssignmentId] = useState({});
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAssignments = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      // 내 제출 내역(GET /members/me/submissions)은 백엔드가 학생 전용으로 제한한다(requireStudent).
      // 관리자 계정으로 호출하면 403이 나므로, 관리자일 때는 아예 호출하지 않는다
      // (관리자 화면에서는 개인 제출 상태 배지 대신 마감 여부만 보여준다).
      const [assignmentsData, submissionsData] = await Promise.all([
        getAssignments({ page, size: PAGE_SIZE }),
        isAdmin ? Promise.resolve({ content: [] }) : getMySubmissions({ page: 0, size: SUBMISSIONS_FETCH_SIZE }),
      ]);

      // 공지 목록과 마찬가지로 응답이 배열 단독인지 페이지네이션 객체인지
      // 백엔드와 확정되지 않아 둘 다 방어적으로 처리한다.
      if (Array.isArray(assignmentsData)) {
        setAssignments(assignmentsData);
        setTotalPages(1);
      } else {
        setAssignments(assignmentsData.content ?? []);
        setTotalPages(assignmentsData.totalPages ?? 1);
      }

      const submissionsList = Array.isArray(submissionsData)
        ? submissionsData
        : submissionsData.content ?? [];
      const map = {};
      submissionsList.forEach((s) => {
        map[s.assignmentId] = s;
      });
      setSubmissionByAssignmentId(map);
    } catch (err) {
      setError(err.message ?? "과제 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [page, isAdmin]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return (
    <AppLayout>
      <div className="assignment-page__header">
        <div>
          <h1 className="assignment-page__title">과제</h1>
          <p className="assignment-page__subtitle">진행 중인 과제와 제출 상태를 확인하세요</p>
        </div>
        {isAdmin && (
          <Link to="/admin/assignments/new" className="page-header-add-btn">
            + 새 과제 등록
          </Link>
        )}
      </div>

      {isLoading && <p className="assignment-page__state">불러오는 중...</p>}

      {!isLoading && error && (
        <p className="assignment-page__state assignment-page__state--error">{error}</p>
      )}

      {!isLoading && !error && assignments.length === 0 && (
        <p className="assignment-page__state">등록된 과제가 없습니다.</p>
      )}

      {!isLoading && !error && assignments.length > 0 && (
        <ul className="assignment-list">
          {assignments.map((a) => {
            const meta = resolveStatusMeta(a, submissionByAssignmentId[a.assignmentId]);
            return (
              <li key={a.assignmentId}>
                <Link to={`/assignments/${a.assignmentId}`} className="assignment-item">
                  <div className="assignment-item__main">
                    <span className="assignment-item__title">{a.title}</span>
                    <span className="assignment-item__due">마감 {formatDateTime(a.dueAt)}</span>
                  </div>
                  <span className={`assignment-item__status ${meta.className}`}>{meta.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!isLoading && !error && totalPages > 1 && (
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

function resolveStatusMeta(assignment, submission) {
  if (submission) {
    return submission.isLate ? STATUS_META.late : STATUS_META.submitted;
  }
  const isPastDue = !!assignment.dueAt && new Date() > new Date(assignment.dueAt);
  if (isPastDue && !assignment.allowLateSubmission) {
    return STATUS_META.closed;
  }
  return STATUS_META.progress;
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
