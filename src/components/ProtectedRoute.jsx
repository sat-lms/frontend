import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * 로그인이 필요한 라우트를 감싸는 가드.
 *
 * - isLoading 중(=로그인 상태 확인 중)에는 아무 것도 안 하고 기다린다.
 *   여기서 바로 /login으로 보내버리면, 새로고침할 때마다 로그인된 사람도
 *   토큰 검증이 끝나기 전 잠깐 로그인 페이지가 번쩍이는 문제가 생긴다.
 * - 로그인 안 되어 있으면 /login으로, 원래 가려던 경로는 state로 들고 가서
 *   로그인 성공 후 그 자리로 돌아올 수 있게 한다.
 * - role prop을 주면(예: role="ADMIN") 해당 role이 아닌 사용자는 접근을 막는다.
 */
function ProtectedRoute({ children, role }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div style={{ padding: 24 }}>로그인 확인 중...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user?.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
