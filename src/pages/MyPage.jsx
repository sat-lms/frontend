import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getMyInfo, updateMyInfo, changeMyPassword, withdrawMe } from "../api/memberApi";
import { isValidName, getPasswordChangeErrors } from "../utils/validators";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import "./AdminWritePage.css";
import "./MyPage.css";

const initialPasswordForm = { currentPassword: "", newPassword: "", newPasswordConfirm: "" };

/**
 * 마이페이지. 명세서 4/5/6/7번 API 연동 (내 정보 조회/수정, 비밀번호 변경, 회원 탈퇴).
 *
 * 로그인 응답(POST /auth/login)에는 studentNumber가 없어서 로그인 직후 AuthContext의
 * user에는 학번이 비어있을 수 있다. 이 화면은 진입 시 GET /members/me를 다시 호출해
 * 최신 정보(학번 포함)를 받아오고, 그 결과로 AuthContext도 함께 갱신한다.
 */
function MyPage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(user);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [name, setName] = useState(user?.name ?? "");

  const fetchProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      const me = await getMyInfo();
      setProfile(me);
      setName(me.name ?? "");
      updateUser(me);
    } catch {
      // 조회 실패해도 컨텍스트에 이미 있던 정보로 화면은 그대로 보여준다.
    } finally {
      setIsLoadingProfile(false);
    }
  }, [updateUser]);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 정보 수정 (이름)
  const [infoError, setInfoError] = useState("");
  const [infoSuccess, setInfoSuccess] = useState("");
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const handleSaveInfo = async () => {
    setInfoError("");
    setInfoSuccess("");
    if (!isValidName(name)) {
      setInfoError("이름은 공백 없이 1~20자로 입력해주세요.");
      return;
    }
    setIsSavingInfo(true);
    try {
      const data = await updateMyInfo({ name: name.trim() });
      updateUser({ name: data?.name ?? name.trim() });
      setProfile((prev) => ({ ...prev, name: data?.name ?? name.trim() }));
      setInfoSuccess("이름이 변경되었습니다.");
    } catch (err) {
      setInfoError(err.message ?? "정보 수정에 실패했습니다.");
    } finally {
      setIsSavingInfo(false);
    }
  };

  // 비밀번호 변경
  const [pwForm, setPwForm] = useState(initialPasswordForm);
  const [pwErrors, setPwErrors] = useState({});
  const [pwSubmitError, setPwSubmitError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handlePwChange = (e) => {
    const { name: field, value } = e.target;
    setPwForm((prev) => ({ ...prev, [field]: value }));
    setPwErrors((prev) => ({ ...prev, [field]: undefined }));
    setPwSubmitError("");
  };

  const handleChangePassword = async () => {
    setPwSubmitError("");
    setPwSuccess("");
    const validationErrors = getPasswordChangeErrors(pwForm);
    if (Object.keys(validationErrors).length > 0) {
      setPwErrors(validationErrors);
      return;
    }
    setIsSavingPassword(true);
    try {
      await changeMyPassword(pwForm);
      setPwSuccess("비밀번호가 변경되었습니다.");
      setPwForm(initialPasswordForm);
    } catch (err) {
      // 명세서 6번: 현재 비밀번호 불일치는 400 또는 401로 내려온다.
      setPwSubmitError(
        err.status === 400 || err.status === 401
          ? err.message ?? "현재 비밀번호가 일치하지 않습니다."
          : err.message ?? "비밀번호 변경에 실패했습니다."
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  // 회원 탈퇴
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    setWithdrawError("");
    if (!withdrawPassword) {
      setWithdrawError("비밀번호를 입력해주세요.");
      return;
    }
    if (!window.confirm("정말 탈퇴하시겠습니까? 탈퇴 후에는 로그인할 수 없고 되돌릴 수 없습니다.")) return;

    setIsWithdrawing(true);
    try {
      await withdrawMe({ password: withdrawPassword });
      await logout();
      navigate("/login", { replace: true, state: { message: "탈퇴가 완료되었습니다." } });
    } catch (err) {
      setWithdrawError(err.message ?? "탈퇴에 실패했습니다.");
      setIsWithdrawing(false);
    }
  };

  return (
    <AppLayout>
      <h1 className="page-title">마이페이지</h1>
      <p className="page-subtitle" style={{ marginBottom: 24 }}>
        내 정보를 확인하고 관리하세요
      </p>

      <div className="admin-write-card mypage-card">
        <h2 className="mypage-card__title">기본 정보</h2>

        <div className="admin-write-field">
          <label className="admin-write-label" htmlFor="mypage-student-number">
            학번
          </label>
          <input
            id="mypage-student-number"
            className="admin-write-input"
            value={isLoadingProfile ? "불러오는 중..." : profile?.studentNumber ?? ""}
            disabled
          />
        </div>

        <div className="admin-write-field">
          <label className="admin-write-label" htmlFor="mypage-name">
            이름
          </label>
          <input
            id="mypage-name"
            className="admin-write-input"
            value={name}
            maxLength={20}
            onChange={(e) => {
              setName(e.target.value);
              setInfoError("");
            }}
          />
        </div>

        {infoError && <p className="admin-write-error">{infoError}</p>}
        {infoSuccess && <p className="mypage-success">{infoSuccess}</p>}

        <div className="mypage-actions">
          <button
            type="button"
            className="admin-write-btn admin-write-btn--primary"
            onClick={handleSaveInfo}
            disabled={isSavingInfo}
          >
            {isSavingInfo ? "저장 중..." : "이름 저장"}
          </button>
        </div>
      </div>

      <div className="admin-write-card mypage-card">
        <h2 className="mypage-card__title">비밀번호 변경</h2>

        <div className="admin-write-field">
          <label className="admin-write-label" htmlFor="mypage-current-password">
            현재 비밀번호
          </label>
          <input
            id="mypage-current-password"
            name="currentPassword"
            type="password"
            className="admin-write-input"
            value={pwForm.currentPassword}
            onChange={handlePwChange}
          />
          {pwErrors.currentPassword && <p className="mypage-field-error">{pwErrors.currentPassword}</p>}
        </div>

        <div className="admin-write-field">
          <label className="admin-write-label" htmlFor="mypage-new-password">
            새 비밀번호
          </label>
          <input
            id="mypage-new-password"
            name="newPassword"
            type="password"
            className="admin-write-input"
            value={pwForm.newPassword}
            onChange={handlePwChange}
          />
          <p className="admin-write-hint">8자 이상, 영문과 숫자를 포함해야 합니다.</p>
          {pwErrors.newPassword && <p className="mypage-field-error">{pwErrors.newPassword}</p>}
        </div>

        <div className="admin-write-field">
          <label className="admin-write-label" htmlFor="mypage-new-password-confirm">
            새 비밀번호 확인
          </label>
          <input
            id="mypage-new-password-confirm"
            name="newPasswordConfirm"
            type="password"
            className="admin-write-input"
            value={pwForm.newPasswordConfirm}
            onChange={handlePwChange}
          />
          {pwErrors.newPasswordConfirm && <p className="mypage-field-error">{pwErrors.newPasswordConfirm}</p>}
        </div>

        {pwSubmitError && <p className="admin-write-error">{pwSubmitError}</p>}
        {pwSuccess && <p className="mypage-success">{pwSuccess}</p>}

        <div className="mypage-actions">
          <button
            type="button"
            className="admin-write-btn admin-write-btn--primary"
            onClick={handleChangePassword}
            disabled={isSavingPassword}
          >
            {isSavingPassword ? "변경 중..." : "비밀번호 변경"}
          </button>
        </div>
      </div>

      <div className="admin-write-card mypage-card mypage-card--danger">
        <h2 className="mypage-card__title mypage-card__title--danger">회원 탈퇴</h2>
        <p className="mypage-danger-desc">
          탈퇴하면 즉시 로그인이 차단됩니다. 제출한 과제와 첨부파일 기록은 삭제되지 않고 그대로
          유지되며, 이 작업은 되돌릴 수 없습니다.
        </p>

        <div className="admin-write-field">
          <label className="admin-write-label" htmlFor="mypage-withdraw-password">
            비밀번호 확인
          </label>
          <input
            id="mypage-withdraw-password"
            type="password"
            className="admin-write-input"
            value={withdrawPassword}
            onChange={(e) => {
              setWithdrawPassword(e.target.value);
              setWithdrawError("");
            }}
          />
        </div>

        {withdrawError && <p className="admin-write-error">{withdrawError}</p>}

        <div className="mypage-actions">
          <button
            type="button"
            className="admin-write-btn mypage-withdraw-btn"
            onClick={handleWithdraw}
            disabled={isWithdrawing}
          >
            {isWithdrawing ? "처리 중..." : "회원 탈퇴"}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

export default MyPage;
