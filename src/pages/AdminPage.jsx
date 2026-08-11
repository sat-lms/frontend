import { useAuth } from "../context/AuthContext";

/**
 * ADMIN 전용 임시 화면. role="ADMIN"이 아니면 ProtectedRoute가 여기 못 들어오게 막는다.
 */
function AdminPage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 32 }}>
      <h1>관리자 페이지</h1>
      <p>{user?.name}님 (ADMIN)</p>
      <button onClick={logout}>로그아웃</button>
    </div>
  );
}

export default AdminPage;
