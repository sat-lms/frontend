import Header from "./Header";
import Sidebar from "./Sidebar";
import "./AppLayout.css";

/**
 * 로그인 이후 화면들이 공통으로 쓰는 레이아웃 (상단 헤더 + 사이드바 + 콘텐츠 영역).
 * SAT-LMS 프로토타입의 inApp 레이아웃 구조를 그대로 따른다.
 * 사용법: <AppLayout><실제 페이지 내용 /></AppLayout>
 */
function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-layout">
        <Sidebar />
        <main className="app-layout__content">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;
