import Header from "./Header";
import Sidebar from "./Sidebar";
import myongjiTree from "../assets/myongji-tree.png";
import "./AppLayout.css";

/**
 * 로그인 이후 화면들이 공통으로 쓰는 레이아웃 (상단 헤더 + 사이드바 + 콘텐츠 영역).
 * SAT-LMS 프로토타입의 inApp 레이아웃 구조를 그대로 따른다.
 * 사용법: <AppLayout><실제 페이지 내용 /></AppLayout>
 *
 * 로그인 화면(BrandPanel)의 우하단 명지나무 워터마크와 짝을 이루도록,
 * 로그인 이후 화면에도 같은 로고를 화면 우하단에 고정 배치한다.
 * 배경이 밝은 화면이라 로그인 화면과 반대로 원본 남색(#002968) 그대로 사용해
 * "남색 나무 + 흰 배경" 조합이 되도록 한다.
 */
function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-layout">
        <Sidebar />
        <main className="app-layout__content">{children}</main>
      </div>
      <img src={myongjiTree} alt="" className="app-shell__watermark" aria-hidden="true" />
    </div>
  );
}

export default AppLayout;
