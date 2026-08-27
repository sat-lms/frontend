import AppLayout from "../components/AppLayout";

/**
 * 회원가입 승인 목록 placeholder. 명세서 8/9/10번 API 연동 예정.
 * (오늘 작업 범위는 디자인 정리까지이고, 실제 데이터 연동은 이후 진행)
 */
function AdminApprovalsPage() {
  return (
    <AppLayout>
      <h1 className="page-title">회원가입 승인</h1>
      <p className="page-subtitle">신규 가입 신청을 검토하고 승인 또는 거절하세요</p>
      <div className="page-empty-card">이 화면은 아직 준비 중입니다.</div>
    </AppLayout>
  );
}

export default AdminApprovalsPage;
