import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

const STUDENT_MENU = [
  { label: "홈", to: "/" },
  { label: "공지사항", to: "/notices" },
  { label: "과제", to: "/assignments" },
  { label: "마이페이지", to: "/mypage" },
];

const ADMIN_MENU = [
  { label: "홈", to: "/" },
  { label: "공지 작성", to: "/admin/notices/new" },
  { label: "과제 등록", to: "/admin/assignments/new" },
  { label: "회원가입 승인", to: "/admin/approvals" },
  { label: "회원 관리", to: "/admin/members" },
  { label: "과제 제출 현황", to: "/admin/submissions" },
  { label: "마이페이지", to: "/mypage" },
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
        {menuItems.map((item) => {
          // "홈"(to: "/")은 모든 경로가 "/"로 시작하므로 startsWith 대신 정확히 일치할 때만 활성 표시한다.
          const isActive =
            item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar__link ${isActive ? "is-active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
