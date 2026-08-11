import AppLayout from "../components/AppLayout";

/**
 * 과제 목록 placeholder. 명세서 23번 API(GET /api/v1/assignments) 연동 예정.
 */
function AssignmentListPage() {
  return (
    <AppLayout>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d29" }}>과제</h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
        진행 중인 과제와 제출 상태를 확인하세요 (준비 중)
      </p>
    </AppLayout>
  );
}

export default AssignmentListPage;
