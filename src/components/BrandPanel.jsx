import myongjiTree from "../assets/myongji-tree.png";
import "./BrandPanel.css";

/**
 * 로그인/회원가입 화면 왼쪽에 들어가는 명지대 브랜딩 패널.
 * Claude Design 목업(SAT-LMS 화면 목업 1. 로그인) 기준으로 구성:
 * - 좌상단: SAT 로고
 * - 배경: 명지나무 워터마크 (낮은 투명도)
 * - 좌하단: 저작권 표기
 */
function BrandPanel() {
  return (
    <div className="brand-panel">
      <img
        src={myongjiTree}
        alt=""
        className="brand-panel__watermark"
        aria-hidden="true"
      />

      <div className="brand-panel__header">
        <span className="brand-logo">SAT</span>
      </div>

      <p className="brand-panel__footer">© 2026 Myongji University</p>
    </div>
  );
}

export default BrandPanel;
