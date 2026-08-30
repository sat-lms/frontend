import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

/**
 * 로그인 이후 화면 상단 헤더. SAT-LMS 프로토타입의 in-app 헤더 구조를 그대로 따른다.
 * 프로토타입은 이메일/학과처럼 실제 회원 테이블에 없는 필드도 보여주지만,
 * 실제 API(GET /api/v1/members/me)가 내려주는 필드(name, studentNumber, role)만 사용한다.
 *
 * 좌측 햄버거 버튼은 AppLayout이 들고 있는 사이드바 열림 상태를 토글한다 — 사이드바는
 * 평소엔 숨어 있다가 이 버튼을 누르면 드로어로 펼쳐지는 방식이다.
 */
function Header({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const initial = user?.name ? user.name.charAt(0) : "?";

  return (
    <header className="app-header">
      <div className="app-header__left">
        <button
          type="button"
          className="app-header__menu-btn"
          onClick={onMenuToggle}
          aria-label="메뉴 열기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* 역할(관리자/학생) 표시는 우측 사용자 정보 영역 하나로 통일한다.
            예전엔 로고 옆에도 같은 역할 라벨을 띄웠는데, 관리자 계정의 이름이
            "관리자"인 경우처럼 오른쪽과 문구가 겹쳐 보여 좌측 라벨은 제거했다. */}
        <Link to="/" className="app-header__brand" aria-label="홈으로 이동">
          <div className="app-header__logo">SAT</div>
        </Link>
      </div>

      <div className="app-header__user">
        <Link to="/mypage" className="app-header__identity" aria-label="마이페이지로 이동">
          <div className="app-header__avatar">{initial}</div>
          <div>
            <div className="app-header__name">{user?.name}</div>
            <div className="app-header__sub">{user?.studentNumber}</div>
          </div>
        </Link>
        <button type="button" className="app-header__logout" onClick={logout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}

export default Header;
