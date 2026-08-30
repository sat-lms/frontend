import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import myongjiTree from "../assets/myongji-tree.png";
import "./AppLayout.css";

function AppLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Header onMenuToggle={() => setIsSidebarOpen((prev) => !prev)} />
      <div className="app-layout">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="app-layout__content">{children}</main>
      </div>
      <img src={myongjiTree} alt="" className="app-shell__watermark" aria-hidden="true" />
    </div>
  );
}

export default AppLayout;
