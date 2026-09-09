import { useState, useEffect, useCallback } from "react";
import { getMemberApplications, reviewMemberApplication } from "../api/adminMemberApi";
import AppLayout from "../components/AppLayout";
import "./AdminWritePage.css";
import "./AdminApprovalsPage.css";

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: "PENDING", label: "대기중" },
  { value: "APPROVED", label: "승인됨" },
  { value: "REJECTED", label: "거절됨" },
];

/**
 * 회원가입 승인 목록. 명세서 8/9/10번 API 연동.
 * GET /api/v1/admin/member-applications (status별 조회) +
 * PATCH /api/v1/admin/member-applications/{memberId} (승인/거절).
 *
 * ⚠️ GitHub PR #107(이슈 #106, "탈퇴 회원 계정 복구")부터는 자진 탈퇴했던 회원이
 * /reactivate 화면에서 복구를 신청해도 정확히 이 목록(같은 GET/PATCH 엔드포인트)에
 * PENDING 상태로 함께 뜬다 — 신규 가입 신청과 복구 신청을 구분해서 보여줄 방법이
 * 현재 API 응답에는 없다(PR #107 diff 확인: 구분 필드 없음). 그래서 이름/학번이 낯익은
 * 항목이 있으면 예전에 탈퇴했던 학생의 복구 신청일 수 있다는 점을 감안해서 검토해야 한다.
 */
function AdminApprovalsPage() {
  const [status, setStatus] = useState("PENDING");
  const [applications, setApplications] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getMemberApplications({ status, page, size: PAGE_SIZE });
      setApplications(data.content ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(err.message ?? "가입 신청 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleChangeTab = (value) => {
    if (value === status) return;
    setStatus(value);
    setPage(0);
  };

  const handleApprove = async (memberId) => {
    if (!window.confirm("이 가입 신청을 승인할까요?")) return;
    setProcessingId(memberId);
    try {
      await reviewMemberApplication(memberId, { action: "APPROVED" });
      await fetchApplications();
    } catch (err) {
      alert(err.message ?? "승인 처리에 실패했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (memberId) => {
    const rejectionReason = window.prompt("거절 사유를 입력하세요");
    if (rejectionReason === null) return;
    if (!rejectionReason.trim()) {
      alert("거절 사유를 입력해야 합니다.");
      return;
    }
    setProcessingId(memberId);
    try {
      await reviewMemberApplication(memberId, { action: "REJECTED", rejectionReason: rejectionReason.trim() });
      await fetchApplications();
    } catch (err) {
      alert(err.message ?? "거절 처리에 실패했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AppLayout>
      <h1 className="page-title">회원가입 승인</h1>
      <p className="page-subtitle">
        신규 가입 신청과 탈퇴 회원의 계정 복구 신청을 함께 검토하고 승인 또는 거절하세요
      </p>

      <div className="admin-approvals__tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`admin-approvals__tab ${status === tab.value ? "is-active" : ""}`}
            onClick={() => handleChangeTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="admin-approvals__state">불러오는 중...</p>}

      {!isLoading && error && (
        <p className="admin-approvals__state admin-approvals__state--error">{error}</p>
      )}

      {!isLoading && !error && applications.length === 0 && (
        <div className="page-empty-card">
          {status === "PENDING" ? "대기 중인 가입 신청이 없습니다." : "해당하는 가입 신청이 없습니다."}
        </div>
      )}

      {!isLoading && !error && applications.length > 0 && (
        <ul className="admin-approvals-list">
          {applications.map((app) => (
            <li key={app.memberId} className="admin-approvals-item">
              <div className="admin-approvals-item__main">
                <span className="admin-approvals-item__name">{app.name}</span>
                <span className="admin-approvals-item__number">{app.studentNumber}</span>
                <span className="admin-approvals-item__date">신청일 {formatDate(app.createdAt)}</span>
              </div>

              {app.status === "PENDING" ? (
                <div className="admin-approvals-item__actions">
                  <button
                    type="button"
                    className="admin-detail-actions__btn"
                    onClick={() => handleApprove(app.memberId)}
                    disabled={processingId === app.memberId}
                  >
                    {processingId === app.memberId ? "처리 중..." : "승인"}
                  </button>
                  <button
                    type="button"
                    className="admin-detail-actions__btn admin-detail-actions__btn--danger"
                    onClick={() => handleReject(app.memberId)}
                    disabled={processingId === app.memberId}
                  >
                    거절
                  </button>
                </div>
              ) : (
                <span
                  className={`admin-approvals-item__status ${
                    app.status === "APPROVED" ? "is-approved" : "is-rejected"
                  }`}
                >
                  {app.status === "APPROVED" ? "승인됨" : "거절됨"}
                </span>
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

export default AdminApprovalsPage;
