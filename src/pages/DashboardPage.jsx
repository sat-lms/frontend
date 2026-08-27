import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";

/**
 * 로그인 후 진입하는 임시 홈 화면.
 */
function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <h1 className="page-title">안녕하세요, {user?.name}님</h1>
      <p className="page-subtitle">
        학번 {user?.studentNumber} · {user?.role}
      </p>
      <p style={{ marginTop: 20 }}>
        <Link to="/notices">공지사항 보러가기</Link>
      </p>
    </AppLayout>
  );
}

export default DashboardPage;
