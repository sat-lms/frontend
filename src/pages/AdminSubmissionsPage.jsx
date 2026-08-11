import AppLayout from "../components/AppLayout";

/**
 * 과제별 제출 현황 placeholder. 명세서 37/38번 API 연동 예정.
 */
function AdminSubmissionsPage() {
  return (
    <AppLayout>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d29" }}>과제 제출 현황</h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
        과제별 제출/미제출/지각 현황을 확인하세요 (준비 중)
      </p>
    </AppLayout>
  );
}

export default AdminSubmissionsPage;
