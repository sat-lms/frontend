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
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1d29" }}>
        안녕하세요, {user?.name}님
      </h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
        학번 {user?.studentNumber} · {user?.role}
      </p>
      <p style={{ marginTop: 20 }}>
        <Link to="/notices">공지사항 보러가기</Link>
      </p>
    </AppLayout>
  );
}

export default DashboardPage;
