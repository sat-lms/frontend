import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { login as loginApi } from "../api/authApi";
import { getLoginErrors } from "../utils/validators";
import { useAuth } from "../context/AuthContext";
import BrandPanel from "../components/BrandPanel";
import "./AuthPage.css";

const initialForm = { studentNumber: "", password: "" };

// 명세서 4쪽: status에 따라 다른 안내 메시지 표시
const STATUS_MESSAGE = {
  PENDING: "아직 승인 대기 중인 계정입니다.",
  REJECTED: "가입이 거절된 계정입니다.",
  WITHDRAWN: "탈퇴한 계정입니다.",
};

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: setAuthUser } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const infoMessage = location.state?.message;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const validationErrors = getLoginErrors(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await loginApi(form);

      // AuthContext에 로그인 상태 반영 (localStorage 저장은 context 내부에서 처리)
      setAuthUser(data.accessToken, {
        memberId: data.memberId,
        name: data.name,
        role: data.role,
        status: data.status,
      });

      // ProtectedRoute가 "원래 가려던 경로"를 state.from으로 넘겨줬으면 그쪽으로,
      // 아니면 role 기준으로 기본 진입 화면으로 이동
      const redirectTo = location.state?.from ?? (data.role === "ADMIN" ? "/admin/approvals" : "/");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err.status === 401) {
        setSubmitError("학번 또는 비밀번호가 일치하지 않습니다.");
      } else if (err.raw?.response?.data?.status) {
        // 백엔드가 status(PENDING/REJECTED/WITHDRAWN)를 함께 내려주는 경우
        const status = err.raw.response.data.status;
        setSubmitError(STATUS_MESSAGE[status] ?? err.message);
      } else {
        setSubmitError(err.message ?? "로그인에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <BrandPanel />

      <div className="auth-page__form-panel">
        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <h1 className="auth-title">로그인</h1>

          {infoMessage && <p className="info-banner">{infoMessage}</p>}

          <div className="form-field">
            <label htmlFor="studentNumber">학번</label>
            <input
              id="studentNumber"
              name="studentNumber"
              type="text"
              inputMode="numeric"
              placeholder="20231234"
              value={form.studentNumber}
              onChange={handleChange}
              aria-invalid={!!errors.studentNumber}
            />
            {errors.studentNumber && <span className="field-error">{errors.studentNumber}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              aria-invalid={!!errors.password}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          {submitError && <p className="submit-error">{submitError}</p>}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>

          <p className="auth-switch">
            계정이 없나요? <Link to="/signup">회원가입</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
