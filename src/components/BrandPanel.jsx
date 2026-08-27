import myongjiTree from "../assets/myongji-tree.png";
import "./BrandPanel.css";

/**
 * 로그인/회원가입 화면 왼쪽에 들어가는 명지대 브랜딩 패널.
 * SAT-LMS 프로토타입(Claude Design 목업, "SAT-LMS 프로토타입.dc.html") 그대로 구현:
 * - 배경에 회전된 대형 워터마크 타이포 "SOFTWARE / ARTIFICIAL / TEAM"
 * - 우하단 명지나무 워터마크
 * - 좌하단 "SAT-LMS" 워드마크 + 저작권 표기
 */
function BrandPanel() {
  return (
    <div className="brand-panel">
      <div className="brand-panel__bgtype" aria-hidden="true">
        <div className="brand-panel__bgtype-line brand-panel__bgtype-line--1">SOFTWARE</div>
        <div className="brand-panel__bgtype-line brand-panel__bgtype-line--2">ARTIFICIAL</div>
        <div className="brand-panel__bgtype-line brand-panel__bgtype-line--3">TEAM</div>
      </div>

      <img src={myongjiTree} alt="" className="brand-panel__watermark" aria-hidden="true" />

      <div className="brand-panel__wordmark">SAT-LMS</div>
      <p className="brand-panel__footer">© 2026 Myongji University · SAT Study</p>
    </div>
  );
}

export default BrandPanel;
