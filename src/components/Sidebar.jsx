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
 * 목업(SAT-LMS 화면 목업 7/8)에 맞춘 좌측 사이드바.
 * role에 따라 학생 메뉴 / 관리자 메뉴를 다르게 보여준다.
 */
function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isAdmin = user?.role === "ADMIN";
  const menuItems = isAdmin ? ADMIN_MENU : STUDENT_MENU;
  const menuLabel = isAdmin ? "관리자 메뉴" : "학생 메뉴";

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo">SAT</span>
      </div>

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

      <div className="sidebar__footer">
        <span className="sidebar__user">{user?.name}님</span>
        <button className="sidebar__logout" onClick={logout}>
          로그아웃
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
