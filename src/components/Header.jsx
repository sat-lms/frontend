import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

/**
 * 로그인 이후 화면 상단 헤더. SAT-LMS 프로토타입의 in-app 헤더 구조를 그대로 따른다.
 * 프로토타입은 이메일/학과처럼 실제 회원 테이블에 없는 필드도 보여주지만,
 * 실제 API(GET /api/v1/members/me)가 내려주는 필드(name, studentNumber, role)만 사용한다.
 */
function Header() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const initial = user?.name ? user.name.charAt(0) : "?";

  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand" aria-label="홈으로 이동">
        <div className="app-header__logo">SAT</div>
        <div className="app-header__role">{isAdmin ? "관리자" : "학생"}</div>
      </Link>

      <div className="app-header__user">
        <div className="app-header__identity">
          <div className="app-header__avatar">{initial}</div>
          <div>
            <div className="app-header__name">{user?.name}</div>
            <div className="app-header__sub">{user?.studentNumber}</div>
          </div>
        </div>
        <button type="button" className="app-header__logout" onClick={logout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}

export default Header;
