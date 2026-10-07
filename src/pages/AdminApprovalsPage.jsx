import { useState, useEffect, useCallback, useRef } from "react";
import {
  getMemberApplications,
  reviewMemberApplication,
  bulkApproveMemberApplications,
  BULK_APPROVE_MAX,
} from "../api/adminMemberApi";
import AppLayout from "../components/AppLayout";
import "./AdminWritePage.css";
import "./AdminApprovalsPage.css";

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: "PENDING", label: "대기중" },
  { value: "APPROVED", label: "승인됨" },
  { value: "REJECTED", label: "거절됨" },
];

const SKIP_REASON_LABEL = {
  NOT_PENDING: "이미 처리됐거나 승인 대기 상태가 아님",
  NOT_FOUND: "존재하지 않는 회원",
};

/**
 * 회원가입 승인 목록. 명세서 8/9/10번 API + 일괄 승인 API(백엔드 #136) 연동.
 * GET   /api/v1/admin/member-applications (status별 조회)
 * PATCH /api/v1/admin/member-applications/{memberId} (한 명씩 승인/거절)
 * POST  /api/v1/admin/member-applications/bulk-approve (선택 일괄 승인)
 *
 * 일괄 선택은 "현재 페이지" 기준이다. 페이지/탭을 옮기면 선택이 초기화되므로
 * 다른 페이지의 회원이 의도치 않게 함께 승인되는 일은 없다.
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

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkNotice, setBulkNotice] = useState(null); // { type: "result" | "error", text, details? }
  const bulkLockRef = useRef(false);
  const selectAllRef = useRef(null);

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

  // 페이지·탭이 바뀌면 선택 초기화 (현재 페이지 기준 선택)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [status, page]);

  const pendingIds = applications.filter((app) => app.status === "PENDING").map((app) => app.memberId);
  // 목록이 재조회돼 사라진 회원은 선택에서 자동 제외
  const selectedOnPage = pendingIds.filter((id) => selectedIds.has(id));
  const selectedCount = selectedOnPage.length;
  const allSelected = pendingIds.length > 0 && selectedCount === pendingIds.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const isBusy = isBulkProcessing || processingId !== null;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const handleChangeTab = (value) => {
    if (value === status) return;
    setStatus(value);
    setPage(0);
    setBulkNotice(null);
  };

  const toggleOne = (memberId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(pendingIds));
  };

  const handleBulkApprove = async () => {
    if (bulkLockRef.current) return;
    const memberIds = selectedOnPage;
    if (memberIds.length === 0) return;
    if (memberIds.length > BULK_APPROVE_MAX) {
      alert(`한 번에 최대 ${BULK_APPROVE_MAX}명까지 승인할 수 있습니다.`);
      return;
    }
    if (!window.confirm(`선택한 ${memberIds.length}명을 승인하시겠습니까?`)) return;

    bulkLockRef.current = true;
    setIsBulkProcessing(true);
    setBulkNotice(null);
    try {
      const result = await bulkApproveMemberApplications(memberIds);
      setBulkNotice(buildResultNotice(result));
    } catch (err) {
      setBulkNotice({ type: "error", text: bulkErrorMessage(err) });
    } finally {
      setSelectedIds(new Set());
      await fetchApplications();
      bulkLockRef.current = false;
      setIsBulkProcessing(false);
    }
  };

  const handleApprove = async (memberId) => {
    if (!window.confirm("이 가입 신청을 승인할까요?")) return;
    setProcessingId(memberId);
    try {
      await reviewMemberApplication(memberId, { action: "APPROVED" });
      await fetchApplications();
    } catch (err) {
      alert(err.message ?? "승인 처리에 실패했습니다.");
      if (err.status === 409 || err.status === 404) await fetchApplications();
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
      if (err.status === 409 || err.status === 404) await fetchApplications();
    } finally {
      setProcessingId(null);
    }
  };

  const showBulkBar = status === "PENDING" && !isLoading && !error && pendingIds.length > 0;

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
            disabled={isBulkProcessing}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {bulkNotice && (
        <div
          className={`admin-approvals__notice ${
            bulkNotice.type === "error" ? "admin-approvals__notice--error" : ""
          }`}
          role={bulkNotice.type === "error" ? "alert" : "status"}
        >
          <div className="admin-approvals__notice-body">
            <p className="admin-approvals__notice-text">{bulkNotice.text}</p>
            {bulkNotice.details?.length > 0 && (
              <ul className="admin-approvals__notice-details">
                {bulkNotice.details.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            className="admin-approvals__notice-close"
            onClick={() => setBulkNotice(null)}
            aria-label="안내 닫기"
          >
            ×
          </button>
        </div>
      )}

      {showBulkBar && (
        <div className="admin-approvals__bulk-bar">
          <label className="admin-approvals__select-all">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={isBusy}
            />
            <span>현재 페이지 전체 선택</span>
          </label>
          <span className="admin-approvals__selected-count">
            {selectedCount > 0 ? `${selectedCount}명 선택됨` : "선택한 회원 없음"}
          </span>
          <button
            type="button"
            className="admin-approvals__bulk-btn"
            onClick={handleBulkApprove}
            disabled={selectedCount === 0 || isBusy}
          >
            {isBulkProcessing ? "승인 처리 중..." : "선택 승인"}
          </button>
        </div>
      )}

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
          {applications.map((app) => {
            const isPending = app.status === "PENDING";
            const isChecked = selectedIds.has(app.memberId);
            return (
              <li
                key={app.memberId}
                className={`admin-approvals-item ${isChecked ? "is-selected" : ""}`}
              >
                <div className="admin-approvals-item__main">
                  {isPending && (
                    <input
                      type="checkbox"
                      className="admin-approvals-item__check"
                      checked={isChecked}
                      onChange={() => toggleOne(app.memberId)}
                      disabled={isBusy}
                      aria-label={`${app.name} 선택`}
                    />
                  )}
                  <span className="admin-approvals-item__name">{app.name}</span>
                  <span className="admin-approvals-item__number">{app.studentNumber}</span>
                  <span className="admin-approvals-item__date">신청일 {formatDate(app.createdAt)}</span>
                </div>

                {isPending ? (
                  <div className="admin-approvals-item__actions">
                    <button
                      type="button"
                      className="admin-detail-actions__btn"
                      onClick={() => handleApprove(app.memberId)}
                      disabled={isBusy}
                    >
                      {processingId === app.memberId ? "처리 중..." : "승인"}
                    </button>
                    <button
                      type="button"
                      className="admin-detail-actions__btn admin-detail-actions__btn--danger"
                      onClick={() => handleReject(app.memberId)}
                      disabled={isBusy}
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
            );
          })}
        </ul>
      )}

      {!isLoading && !error && totalPages > 1 && (
        <div className="admin-approvals__pagination">
          <button disabled={page === 0 || isBulkProcessing} onClick={() => setPage((prev) => prev - 1)}>
            이전
          </button>
          <span>
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1 || isBulkProcessing}
            onClick={() => setPage((prev) => prev + 1)}
          >
            다음
          </button>
        </div>
      )}
    </AppLayout>
  );
}

/** success=true여도 전원 제외일 수 있으므로 집계값으로만 안내 문구를 만든다. */
function buildResultNotice(result) {
  const approved = result?.approvedCount ?? 0;
  const skipped = result?.skippedCount ?? 0;

  let text;
  if (approved > 0 && skipped === 0) text = `${approved}명 승인되었습니다.`;
  else if (approved > 0) text = `${approved}명 승인, ${skipped}명 제외되었습니다.`;
  else text = `승인된 회원이 없습니다. ${skipped}명 모두 제외되었습니다.`;

  const reasonCounts = {};
  (result?.results ?? []).forEach((item) => {
    if (item.result === "SKIPPED") {
      const key = item.reason ?? "UNKNOWN";
      reasonCounts[key] = (reasonCounts[key] ?? 0) + 1;
    }
  });
  const details = Object.entries(reasonCounts).map(
    ([reason, count]) => `제외 ${count}명 — ${SKIP_REASON_LABEL[reason] ?? "기타 사유"}`
  );

  return { type: "result", text, details };
}

function bulkErrorMessage(err) {
  switch (err?.status) {
    case 400:
      return `잘못된 요청입니다. 한 번에 최대 ${BULK_APPROVE_MAX}명까지 승인할 수 있습니다.`;
    case 401:
      return "로그인이 필요합니다. 다시 로그인해 주세요.";
    case 403:
      return "일괄 승인 권한이 없습니다. 승인된 관리자 계정인지 확인해 주세요.";
    case 409:
      return "다른 처리와 충돌해 일괄 승인이 취소되었습니다. 아무도 승인되지 않았으니 목록을 확인 후 다시 시도해 주세요.";
    default:
      return "일괄 승인 중 오류가 발생해 처리되지 않았습니다. 목록을 확인 후 다시 시도해 주세요.";
  }
}

function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default AdminApprovalsPage;
