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
