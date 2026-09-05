import { useState, useEffect, useCallback } from "react";
import { getAssignments, getSubmissionAttachmentDownloadUrl } from "../api/assignmentApi";
import { getAssignmentSubmissionStatus, getAdminSubmissionDetail } from "../api/adminSubmissionApi";
import AppLayout from "../components/AppLayout";
import SubmissionComments from "../components/SubmissionComments";
import "./AdminWritePage.css";
import "./AdminSubmissionsPage.css";

const PAGE_SIZE = 20;
// 과제 선택 드롭다운에 쓸 전체 과제 목록. 과제 수가 아주 많지는 않을 거라 보고 넉넉하게 한 번에 가져온다.
const ASSIGNMENTS_FETCH_SIZE = 200;

const STATUS_TABS = [
  { value: undefined, label: "전체" },
  { value: "SUBMITTED", label: "제출완료" },
  { value: "NOT_SUBMITTED", label: "미제출" },
  { value: "LATE", label: "지각제출" },
];

/**
 * 과제별 제출 현황. 명세서 37/38번 API 연동.
 * GET /api/v1/admin/assignments/{assignmentId}/submissions (제출/미제출/지각 카운트 + 학생별 상태 목록) +
 * GET /api/v1/admin/submissions/{submissionId} (제출물 상세 - 모달로 표시).
 *
 * 제출물 상세 모달에 댓글(피드백, GitHub 이슈 #96/PR #100) 섹션도 함께 보여준다 — 관리자가
 * 제출물을 열람하는 화면이 곧 "이미 제출이 존재하는" 화면이라 댓글 기능의 전제 조건과 맞는다.
 * 모달을 열 때 이미 detailSubmissionId로 어떤 제출물인지 알고 있으므로 그대로 넘긴다.
 */
function AdminSubmissionsPage() {
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");

  const [status, setStatus] = useState(undefined);
  const [page, setPage] = useState(0);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [detailSubmissionId, setDetailSubmissionId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    (async () => {
      setAssignmentsLoading(true);
      try {
        const data = await getAssignments({ page: 0, size: ASSIGNMENTS_FETCH_SIZE });
        const list = Array.isArray(data) ? data : data.content ?? [];
        setAssignments(list);
        if (list.length > 0) setSelectedAssignmentId(String(list[0].assignmentId));
      } catch {
        setError("과제 목록을 불러오지 못했습니다.");
      } finally {
        setAssignmentsLoading(false);
      }
    })();
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!selectedAssignmentId) return;
    setIsLoading(true);
    setError("");
    try {
      const data = await getAssignmentSubmissionStatus(selectedAssignmentId, { status, page, size: PAGE_SIZE });
      setSummary(data);
    } catch (err) {
      setError(err.message ?? "제출 현황을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedAssignmentId, status, page]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleChangeAssignment = (e) => {
    setSelectedAssignmentId(e.target.value);
    setStatus(undefined);
    setPage(0);
  };

  const handleChangeTab = (value) => {
    if (value === status) return;
    setStatus(value);
    setPage(0);
  };

  const openDetail = async (submissionId) => {
    if (!submissionId) return;
    setDetailSubmissionId(submissionId);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const data = await getAdminSubmissionDetail(submissionId);
      setDetail(data);
    } catch (err) {
      setDetailError(err.message ?? "제출물을 불러오지 못했습니다.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailSubmissionId(null);
    setDetail(null);
    setDetailError("");
  };

  const handleDownloadFile = async (attachmentId) => {
    try {
      const { downloadUrl } = await getSubmissionAttachmentDownloadUrl(attachmentId);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch {
      alert("파일 다운로드 링크를 가져오지 못했습니다.");
    }
  };

  const students = summary?.students?.content ?? [];
  const totalPages = summary?.students?.totalPages ?? 1;

  return (
    <AppLayout>
      <h1 className="page-title">과제 제출 현황</h1>
      <p className="page-subtitle">과제별 제출/미제출/지각 현황을 확인하세요</p>

      <div className="admin-submissions__picker">
        <label htmlFor="admin-submissions-assignment">과제 선택</label>
        {assignmentsLoading ? (
          <p className="admin-submissions__state">과제 목록을 불러오는 중...</p>
        ) : assignments.length === 0 ? (
          <div className="page-empty-card">등록된 과제가 없습니다.</div>
        ) : (
          <select
            id="admin-submissions-assignment"
            className="admin-submissions__select"
            value={selectedAssignmentId}
            onChange={handleChangeAssignment}
          >
            {assignments.map((a) => (
              <option key={a.assignmentId} value={a.assignmentId}>
                {a.title} (마감 {formatDate(a.dueAt)})
              </option>
            ))}
          </select>
        )}
      </div>

      {!assignmentsLoading && selectedAssignmentId && (
        <>
          {summary && (
            <div className="admin-submissions__stats">
              <div className="admin-submissions__stat">
                <p className="admin-submissions__stat-label">제출완료</p>
                <p className="admin-submissions__stat-value">{summary.submittedCount}</p>
              </div>
              <div className="admin-submissions__stat">
                <p className="admin-submissions__stat-label">미제출</p>
                <p className="admin-submissions__stat-value">{summary.notSubmittedCount}</p>
              </div>
              <div className="admin-submissions__stat admin-submissions__stat--late">
                <p className="admin-submissions__stat-label">지각제출 (제출완료 중)</p>
                <p className="admin-submissions__stat-value">{summary.lateCount}</p>
              </div>
            </div>
          )}

          <div className="admin-submissions__tabs">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.label}
                type="button"
                className={`admin-submissions__tab ${status === tab.value ? "is-active" : ""}`}
                onClick={() => handleChangeTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading && <p className="admin-submissions__state">불러오는 중...</p>}

          {!isLoading && error && (
            <p className="admin-submissions__state admin-submissions__state--error">{error}</p>
          )}

          {!isLoading && !error && students.length === 0 && (
            <div className="page-empty-card">해당하는 학생이 없습니다.</div>
          )}

          {!isLoading && !error && students.length > 0 && (
            <ul className="admin-submissions-list">
              {students.map((s) => (
                <li key={s.submissionId ?? s.studentNumber} className="admin-submissions-item">
                  <div className="admin-submissions-item__main">
                    <span className="admin-submissions-item__name">{s.studentName}</span>
                    <span className="admin-submissions-item__number">{s.studentNumber}</span>
                    <span className="admin-submissions-item__date">
                      {s.submittedAt ? `제출 ${formatDateTime(s.submittedAt)}` : "미제출"}
                    </span>
                  </div>
                  <div className="admin-submissions-item__right">
                    <span
                      className={`admin-submissions-item__status ${
                        !s.submissionId ? "is-not-submitted" : s.isLate ? "is-late" : "is-submitted"
                      }`}
                    >
                      {!s.submissionId ? "미제출" : s.isLate ? "지각제출" : "제출완료"}
                    </span>
                    {s.submissionId && (
                      <button
                        type="button"
                        className="admin-detail-actions__btn"
                        onClick={() => openDetail(s.submissionId)}
                      >
                        상세보기
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && !error && totalPages > 1 && (
            <div className="admin-submissions__pagination">
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
        </>
      )}

      {detailSubmissionId && (
        <div className="admin-submissions-modal__backdrop" onClick={closeDetail}>
          <div className="admin-submissions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-submissions-modal__head">
              <h2 className="admin-submissions-modal__title">
                {detailLoading ? "불러오는 중..." : detail?.studentName ?? "제출물 상세"}
              </h2>
              <button type="button" className="admin-submissions-modal__close" onClick={closeDetail} aria-label="닫기">
                ×
              </button>
            </div>

            {detailLoading && <p className="admin-submissions__state">불러오는 중...</p>}
            {!detailLoading && detailError && (
              <p className="admin-submissions__state admin-submissions__state--error">{detailError}</p>
            )}

            {!detailLoading && !detailError && detail && (
              <>
                <p className="admin-submissions-modal__meta">
                  {detail.studentNumber} · {detail.assignmentTitle} ·{" "}
                  {detail.isLate ? "지각 제출" : "제출"} {formatDateTime(detail.updatedAt ?? detail.createdAt)}
                </p>
                <p className="admin-submissions-modal__text">{detail.textContent || "(내용 없음)"}</p>

                {detail.files?.length > 0 && (
                  <>
                    <p className="admin-submissions-modal__files-label">제출한 파일</p>
                    <div className="admin-submissions-modal__files">
                      {detail.files.map((file) => (
                        <button
                          key={file.attachmentId}
                          type="button"
                          className="admin-submissions-modal__file-btn"
                          onClick={() => handleDownloadFile(file.attachmentId)}
                        >
                          {file.originalName}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <SubmissionComments submissionId={detailSubmissionId} />
              </>
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

export default AdminSubmissionsPage;
