import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { requestReactivation } from "../api/authApi";
import { getReactivationErrors } from "../utils/validators";
import BrandPanel from "../components/BrandPanel";
import "./AuthPage.css";

const initialForm = { studentNumber: "", currentPassword: "", passwordConfirm: "" };

/**
 * 계정 복구 신청. GitHub PR #107(이슈 #106, "탈퇴 회원 계정 복구") 연동.
 * POST /api/v1/auth/reactivation-requests
 *
 * 자진 탈퇴(SELF_WITHDRAWAL)한 회원만 신청할 수 있다 — 관리자에게 추방(ADMIN_EXPULSION)된
 * 계정은 신청해도 백엔드가 401로 막는다. 다만 백엔드가 "회원 없음/비밀번호 불일치/자진탈퇴
 * 아님/추방됨"을 전부 같은 401 메시지("계정 복구 정보를 확인할 수 없습니다.")로 뭉뚱그려
 * 내려주므로, 프론트도 어떤 경우인지 구분해서 알려주지 않고 그 메시지를 그대로 보여준다
 * (계정 존재 여부 등이 외부에 노출되지 않도록 하려는 백엔드 의도로 보임).
 *
 * 신청이 승인되면 로그인 이후 흐름은 신규 가입 승인과 동일하다(status: PENDING →
 * 관리자가 회원가입 승인 화면에서 승인/거절, 승인되면 APPROVED). 관리자 화면에는 신규
 * 가입 신청과 복구 신청이 구분 없이 섞여서 보인다는 게 현재 백엔드의 한계다 — 응답에
 * 이를 구분할 필드(예: isReactivation, deactivationReason)가 없다(PR #107 diff로 확인).
 */
function ReactivationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const validationErrors = getReactivationErrors(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await requestReactivation(form);
      navigate("/login", {
        state: { message: "계정 복구 신청이 완료되었습니다. 관리자 승인을 기다려주세요." },
      });
    } catch (err) {
      // 400(비밀번호 확인 불일치 등)·401(복구 정보 확인 불가)·429(요청 과다) 모두
      // 백엔드 메시지를 그대로 보여준다 — axiosInstance가 이미 message만 뽑아서 준다.
      setSubmitError(err.message ?? "계정 복구 신청에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <BrandPanel />

      <div className="auth-page__form-panel">
        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <h1 className="auth-title">계정 복구 신청</h1>
          <p className="auth-subtitle">
            자진 탈퇴한 계정만 복구할 수 있어요. 탈퇴 전 학번과 비밀번호를 입력하면 관리자
            승인 후 다시 로그인할 수 있습니다.
          </p>

          <div className="form-field">
            <label htmlFor="reactivate-studentNumber">학번</label>
            <input
              id="reactivate-studentNumber"
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
            <label htmlFor="reactivate-currentPassword">탈퇴 전 비밀번호</label>
            <input
              id="reactivate-currentPassword"
              name="currentPassword"
              type="password"
              value={form.currentPassword}
              onChange={handleChange}
              aria-invalid={!!errors.currentPassword}
            />
            {errors.currentPassword && <span className="field-error">{errors.currentPassword}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="reactivate-passwordConfirm">비밀번호 확인</label>
            <input
              id="reactivate-passwordConfirm"
              name="passwordConfirm"
              type="password"
              value={form.passwordConfirm}
              onChange={handleChange}
              aria-invalid={!!errors.passwordConfirm}
            />
            {errors.passwordConfirm && <span className="field-error">{errors.passwordConfirm}</span>}
          </div>

          {submitError && <p className="submit-error">{submitError}</p>}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "신청 중..." : "복구 신청"}
          </button>

          <p className="auth-switch">
            <Link to="/login">← 로그인으로 돌아가기</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default ReactivationPage;
