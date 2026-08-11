import { useAuth } from "../context/AuthContext";

/**
 * 로그인 후 진입하는 임시 홈 화면.
 * 공지/과제 목록 화면이 만들어지기 전까지의 placeholder.
 */
function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 32 }}>
      <h1>안녕하세요, {user?.name}님</h1>
      <p>학번: {user?.studentNumber}</p>
      <p>역할: {user?.role}</p>
      <button onClick={logout}>로그아웃</button>
    </div>
  );
}

export default DashboardPage;
