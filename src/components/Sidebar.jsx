import { useEffect } from "react";
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
 *
 * 평소엔 화면 밖(왼쪽)에 숨어 있다가 헤더의 햄버거 버튼(AppLayout이 관리하는 isOpen)을
 * 누르면 드로어로 슬라이드되어 펼쳐진다. 배경(backdrop) 클릭, 메뉴 항목 선택, Esc 키로
 * 모두 닫히게 해서 "펼쳤다가 목록에서 하나 고르면 다시 접히는" 흐름을 만든다.
 */
function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const location = useLocation();

  const isAdmin = user?.role === "ADMIN";
  const menuItems = isAdmin ? ADMIN_MENU : STUDENT_MENU;
  const menuLabel = isAdmin ? "관리자 메뉴" : "학생 메뉴";

  // Esc로도 닫을 수 있게 하고, 드로어가 열려 있는 동안은 뒤 배경 스크롤을 막는다.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}

      <aside className={`sidebar ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
        <div className="sidebar__head">
          <p className="sidebar__section-label">{menuLabel}</p>
          <button type="button" className="sidebar__close" onClick={onClose} aria-label="메뉴 닫기">
            ×
          </button>
        </div>

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
                onClick={onClose}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
