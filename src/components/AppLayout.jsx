import Sidebar from "./Sidebar";
import "./AppLayout.css";

/**
 * 로그인 이후 화면들이 공통으로 쓰는 레이아웃 (사이드바 + 콘텐츠 영역).
 * 사용법: <AppLayout><실제 페이지 내용 /></AppLayout>
 */
function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-layout__content">{children}</main>
    </div>
  );
}

export default AppLayout;
