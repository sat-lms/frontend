import AppLayout from "../components/AppLayout";

/**
 * 과제별 제출 현황 placeholder. 명세서 37/38번 API 연동 예정.
 * (오늘 작업 범위는 디자인 정리까지이고, 실제 데이터 연동은 이후 진행)
 */
function AdminSubmissionsPage() {
  return (
    <AppLayout>
      <h1 className="page-title">과제 제출 현황</h1>
      <p className="page-subtitle">과제별 제출/미제출/지각 현황을 확인하세요</p>
      <div className="page-empty-card">이 화면은 아직 준비 중입니다.</div>
    </AppLayout>
  );
}

export default AdminSubmissionsPage;
