import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

const STUDENT_MENU = [
  { label: "공지사항", to: "/notices" },
  { label: "과제", to: "/assignments" },
];

const ADMIN_MENU = [
  { label: "회원가입 승인", to: "/admin/approvals" },
  { label: "과제 제출 현황", to: "/admin/submissions" },
];

/**
 * SAT-LMS 프로토타입의 좌측 사이드바. role에 따라 학생 메뉴 / 관리자 메뉴를 다르게 보여준다.
 * 사용자 정보/로그아웃은 상단 헤더(Header)로 옮겨져서 이 컴포넌트는 메뉴만 담당한다.
 */
function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const isAdmin = user?.role === "ADMIN";
  const menuItems = isAdmin ? ADMIN_MENU : STUDENT_MENU;
  const menuLabel = isAdmin ? "관리자 메뉴" : "학생 메뉴";

  return (
    <aside className="sidebar">
      <p className="sidebar__section-label">{menuLabel}</p>

      <nav className="sidebar__nav">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`sidebar__link ${
              location.pathname.startsWith(item.to) ? "is-active" : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
