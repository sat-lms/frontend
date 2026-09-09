// 명세서 3~4쪽 기준 검증 규칙

// 학번: 숫자 8~10자리
export const isValidStudentNumber = (value) => /^\d{8,10}$/.test(value);

// 이름: 1~20자, 공백만 입력 불가
export const isValidName = (value) => {
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 20;
};

// 비밀번호: 8자 이상, 영문+숫자 포함
export const isValidPassword = (value) =>
  value.length >= 8 && /[a-zA-Z]/.test(value) && /\d/.test(value);

export const getSignupErrors = ({ studentNumber, name, password, passwordConfirm }) => {
  const errors = {};

  if (!isValidStudentNumber(studentNumber)) {
    errors.studentNumber = "학번은 숫자 8~10자리로 입력해주세요.";
  }
  if (!isValidName(name)) {
    errors.name = "이름은 공백 없이 1~20자로 입력해주세요.";
  }
  if (!isValidPassword(password)) {
    errors.password = "비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다.";
  }
  if (password !== passwordConfirm) {
    errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
  }

  return errors;
};

export const getLoginErrors = ({ studentNumber, password }) => {
  const errors = {};

  if (!isValidStudentNumber(studentNumber)) {
    errors.studentNumber = "학번은 숫자 8~10자리로 입력해주세요.";
  }
  if (!password) {
    errors.password = "비밀번호를 입력해주세요.";
  }

  return errors;
};

// 명세서 6번(PATCH /api/v1/members/me/password) 기준 사전 검증.
// currentPassword의 실제 일치 여부는 백엔드만 판단할 수 있으므로 여기서는 값이 비어있는지만 본다.
export const getPasswordChangeErrors = ({ currentPassword, newPassword, newPasswordConfirm }) => {
  const errors = {};

  if (!currentPassword) {
    errors.currentPassword = "현재 비밀번호를 입력해주세요.";
  }
  if (!isValidPassword(newPassword)) {
    errors.newPassword = "새 비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다.";
  }
  if (newPassword !== newPasswordConfirm) {
    errors.newPasswordConfirm = "새 비밀번호가 일치하지 않습니다.";
  }
  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.newPassword = "현재 비밀번호와 다른 새 비밀번호를 입력해주세요.";
  }

  return errors;
};

// 계정 복구 신청(POST /api/v1/auth/reactivation-requests, PR #107/이슈 #106) 사전 검증.
// ⚠️ currentPassword는 "새로 만드는" 비밀번호가 아니라 탈퇴 전에 쓰던 기존 비밀번호를 그대로
// 입력받는 것이므로, isValidPassword(8자+영문+숫자) 형식 검증을 걸면 안 된다 — 백엔드도
// @NotBlank + 72바이트 이하만 검증한다(MemberWithdrawalRequest/ReactivationRequest 공통 톤).
export const getReactivationErrors = ({ studentNumber, currentPassword, passwordConfirm }) => {
  const errors = {};

  if (!isValidStudentNumber(studentNumber)) {
    errors.studentNumber = "학번은 숫자 8~10자리로 입력해주세요.";
  }
  if (!currentPassword) {
    errors.currentPassword = "탈퇴 전 사용하던 비밀번호를 입력해주세요.";
  }
  if (!passwordConfirm) {
    errors.passwordConfirm = "비밀번호 확인을 입력해주세요.";
  } else if (currentPassword && currentPassword !== passwordConfirm) {
    errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
  }

  return errors;
};
