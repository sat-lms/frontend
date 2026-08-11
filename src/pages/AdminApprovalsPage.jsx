import AppLayout from "../components/AppLayout";

/**
 * 회원가입 승인 목록 placeholder. 명세서 8/9/10번 API 연동 예정.
 */
function AdminApprovalsPage() {
  return (
    <AppLayout>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d29" }}>회원가입 승인</h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
        신규 가입 신청을 검토하고 승인 또는 거절하세요 (준비 중)
      </p>
    </AppLayout>
  );
}

export default AdminApprovalsPage;
