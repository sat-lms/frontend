import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import NoticeListPage from "./pages/NoticeListPage";
import NoticeDetailPage from "./pages/NoticeDetailPage";
import AssignmentListPage from "./pages/AssignmentListPage";
import AssignmentDetailPage from "./pages/AssignmentDetailPage";
import AdminApprovalsPage from "./pages/AdminApprovalsPage";
import AdminSubmissionsPage from "./pages/AdminSubmissionsPage";
import NoticeWritePage from "./pages/NoticeWritePage";
import AssignmentWritePage from "./pages/AssignmentWritePage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notices"
            element={
              <ProtectedRoute>
                <NoticeListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notices/:noticeId"
            element={
              <ProtectedRoute>
                <NoticeDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments"
            element={
              <ProtectedRoute>
                <AssignmentListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments/:assignmentId"
            element={
              <ProtectedRoute>
                <AssignmentDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/approvals"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminApprovalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/submissions"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminSubmissionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notices/new"
            element={
              <ProtectedRoute role="ADMIN">
                <NoticeWritePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notices/:noticeId/edit"
            element={
              <ProtectedRoute role="ADMIN">
                <NoticeWritePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/assignments/new"
            element={
              <ProtectedRoute role="ADMIN">
                <AssignmentWritePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/assignments/:assignmentId/edit"
            element={
              <ProtectedRoute role="ADMIN">
                <AssignmentWritePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
