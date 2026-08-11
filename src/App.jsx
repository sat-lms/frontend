import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* TODO: 로그인 후 진입할 대시보드/공지/과제 라우트 추가 예정 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/admin" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
