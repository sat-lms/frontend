import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../api/authApi";
import { isValidStudentNumber, isValidName, isValidPassword } from "../utils/validators";
import BrandPanel from "../components/BrandPanel";
import "./AuthPage.css";

// SAT-LMS 프로토타입의 atSignup 4단계 위저드를 그대로 구현한다.
const STEPS = [
  { title: "학번 입력", desc: "가입에 사용할 학번을 입력해 주세요.", next: "다음" },
  { title: "이름 입력", desc: "학적부에 등록된 이름을 입력해 주세요.", next: "다음" },
  { title: "비밀번호 설정", desc: "로그인에 사용할 비밀번호를 설정해 주세요.", next: "다음" },
  { title: "입력 내용 확인", desc: "입력한 정보를 확인하고 가입을 신청하세요.", next: "회원가입 신청" },
];

const initialForm = { studentNumber: "", name: "", password: "", passwordConfirm: "" };

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [stepError, setStepError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const field = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setStepError("");
  };

  // 각 단계를 넘어갈 때 프론트에서 먼저 검증한다 (최종 검증은 백엔드가 다시 수행).
  const validateStep = () => {
    if (step === 0 && !isValidStudentNumber(form.studentNumber)) {
      return "학번은 숫자 8~10자리로 입력해주세요.";
    }
    if (step === 1 && !isValidName(form.name)) {
      return "이름은 공백 없이 1~20자로 입력해주세요.";
    }
    if (step === 2) {
      if (!isValidPassword(form.password)) {
        return "비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다.";
      }
      if (form.password !== form.passwordConfirm) {
        return "비밀번호가 일치하지 않습니다.";
      }
    }
    return "";
  };

  const handleBack = () => {
    setStepError("");
    setSubmitError("");
    if (step === 0) {
      navigate("/login");
      return;
    }
    setStep((prev) => prev - 1);
  };

  const handleNext = async () => {
    const error = validateStep();
    if (error) {
      setStepError(error);
      return;
    }
    setStepError("");

    if (step < STEPS.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      await signup(form);
      navigate("/login", {
        state: { message: "가입 신청이 완료되었습니다. 운영자 승인 후 로그인할 수 있어요." },
      });
    } catch (err) {
      if (err.status === 409) {
        setStep(0);
        setStepError("이미 가입된 학번입니다.");
      } else {
        setSubmitError(err.message ?? "회원가입에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const pwMatch =
    form.passwordConfirm.length > 0 &&
    form.password === form.passwordConfirm &&
    isValidPassword(form.password);

  return (
    <div className="auth-page">
      <BrandPanel />

      <div className="auth-page__form-panel">
        <div className="auth-card">
          <div className="signup-step__head">
            <button type="button" className="signup-step__back" onClick={handleBack}>
              ← 뒤로
            </button>
            <div className="signup-step__bars">
              {STEPS.map((s, i) => (
                <div key={s.title} className={`signup-step__bar ${i <= step ? "is-done" : ""}`} />
              ))}
            </div>
            <div className="signup-step__count">
              {step + 1} / {STEPS.length}
            </div>
          </div>

          <h1 className="auth-title">{STEPS[step].title}</h1>
          <p className="auth-subtitle">{STEPS[step].desc}</p>

          {step === 0 && (
            <div className="form-field">
              <label htmlFor="studentNumber">학번</label>
              <input
                id="studentNumber"
                type="text"
                inputMode="numeric"
                placeholder="20261234"
                value={form.studentNumber}
                onChange={field("studentNumber")}
                autoFocus
              />
              <p className="form-hint">재학 중인 학번 8자리를 입력해 주세요.</p>
            </div>
          )}

          {step === 1 && (
            <div className="form-field">
              <label htmlFor="name">이름</label>
              <input
                id="name"
                type="text"
                placeholder="홍길동"
                value={form.name}
                onChange={field("name")}
                autoFocus
              />
              <p className="form-hint">학적부와 동일한 실명을 입력해 주세요.</p>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="form-field">
                <label htmlFor="password">비밀번호</label>
                <input
                  id="password"
                  type="password"
                  placeholder="8자 이상 입력"
                  value={form.password}
                  onChange={field("password")}
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label htmlFor="passwordConfirm">비밀번호 확인</label>
                <input
                  id="passwordConfirm"
                  type="password"
                  placeholder="비밀번호를 다시 입력"
                  value={form.passwordConfirm}
                  onChange={field("passwordConfirm")}
                />
              </div>
              <p
                className={`form-hint ${
                  form.passwordConfirm ? (pwMatch ? "is-ok" : "is-error") : ""
                }`}
              >
                {form.passwordConfirm
                  ? pwMatch
                    ? "비밀번호가 일치합니다."
                    : "비밀번호가 일치하지 않거나 8자 미만입니다."
                  : "8자 이상, 영문·숫자 조합을 권장합니다."}
              </p>
            </>
          )}

          {step === 3 && (
            <div>
              <div className="signup-review">
                <div className="signup-review__row">
                  <span>학번</span>
                  <strong>{form.studentNumber}</strong>
                </div>
                <div className="signup-review__row">
                  <span>이름</span>
                  <strong>{form.name}</strong>
                </div>
                <div className="signup-review__row">
                  <span>비밀번호</span>
                  <strong>••••••••</strong>
                </div>
              </div>
              <p className="form-hint">신청 완료 후 관리자 승인이 되면 로그인할 수 있습니다.</p>
            </div>
          )}

          {stepError && <p className="submit-error">{stepError}</p>}
          {submitError && <p className="submit-error">{submitError}</p>}

          <button
            type="button"
            className="auth-submit"
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? "신청 중..." : STEPS[step].next}
          </button>

          <p className="auth-switch">
            이미 계정이 있나요? <Link to="/login">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
