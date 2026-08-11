import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../api/authApi";
import { getSignupErrors } from "../utils/validators";
import BrandPanel from "../components/BrandPanel";
import "./AuthPage.css";

const initialForm = {
  studentNumber: "",
  name: "",
  password: "",
  passwordConfirm: "",
};

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    // 프론트 사전 검증 (백엔드에서 최종 검증 다시 수행)
    const validationErrors = getSignupErrors(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(form);
      navigate("/login", {
        state: { message: "가입 신청이 완료되었습니다. 운영자 승인 후 로그인할 수 있어요." },
      });
    } catch (err) {
      if (err.status === 409) {
        setErrors((prev) => ({ ...prev, studentNumber: "이미 가입된 학번입니다." }));
      } else {
        setSubmitError(err.message ?? "회원가입에 실패했습니다. 다시 시도해주세요.");
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
          <h1 className="auth-title">회원가입</h1>
          <p className="auth-subtitle">가입 신청 후 운영자 승인이 필요합니다.</p>

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
            <label htmlFor="name">이름</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="최인준"
              value={form.name}
              onChange={handleChange}
              aria-invalid={!!errors.name}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="영문 + 숫자 8자 이상"
              value={form.password}
              onChange={handleChange}
              aria-invalid={!!errors.password}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="passwordConfirm">비밀번호 확인</label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              value={form.passwordConfirm}
              onChange={handleChange}
              aria-invalid={!!errors.passwordConfirm}
            />
            {errors.passwordConfirm && (
              <span className="field-error">{errors.passwordConfirm}</span>
            )}
          </div>

          {submitError && <p className="submit-error">{submitError}</p>}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "신청 중..." : "가입 신청하기"}
          </button>

          <p className="auth-switch">
            이미 계정이 있나요? <Link to="/login">로그인</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default SignupPage;
