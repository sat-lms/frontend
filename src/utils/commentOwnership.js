/**
 * 댓글이 현재 로그인한 사용자의 것인지 판단한다.
 *
 * 우선순위:
 * 1. authorId (memberId)      — 백엔드가 내려주면 이걸로 비교 (가장 정확)
 * 2. authorStudentNumber       — 학번은 유니크하므로 이것도 정확
 * 3. authorName                — 위 두 필드가 모두 없을 때만 임시 폴백 (동명이인이면 오판 가능)
 *
 * 백엔드 NoticeCommentResponse / SubmissionCommentResponse에 authorId 또는
 * authorStudentNumber가 추가되면 별도 프론트 수정 없이 자동으로 정확한 비교로 전환된다.
 */
export const isMyComment = (comment, user) => {
  if (!comment || !user) return false;

  if (comment.authorId != null && user.id != null) {
    return String(comment.authorId) === String(user.id);
  }
  if (comment.authorStudentNumber != null && user.studentNumber != null) {
    return String(comment.authorStudentNumber) === String(user.studentNumber);
  }
  // 폴백: 식별자가 없으면 이름으로 비교 (동명이인 한계 있음 — 백엔드 필드 추가 필요)
  return comment.authorName === user.name;
};
