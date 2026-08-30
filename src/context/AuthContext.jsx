import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMyInfo } from "../api/memberApi";
import { logout as logoutApi } from "../api/authApi";

const AuthContext = createContext(null);

/**
 * 앱 전체의 로그인 상태를 관리한다 (JWT accessToken 단독 방식 기준).
 *
 * 동작 방식:
 * 1. 앱이 처음 켜질 때(새로고침 포함) localStorage에 accessToken이 있는지 확인한다.
 * 2. 있으면 GET /api/v1/members/me를 호출해 토큰이 아직 유효한지 검증하고,
 *    유효하면 user 상태를 복원한다. (토큰 자체는 localStorage에 남아있지만
 *    실제로 유효한지는 서버에 물어봐야 확실히 알 수 있다 — 만료/탈퇴 등)
 * 3. 유효하지 않으면(401 등) 로컬 토큰을 지우고 로그아웃 상태로 둔다.
 *
 * isLoading이 true인 동안은 "로그인 상태를 확인 중"이라는 뜻이므로,
 * 이 시점에 섣불리 /login으로 리다이렉트하면 안 된다 (ProtectedRoute에서 사용).
 *
 * ⚠️ user.id 필드 통일: 로그인 응답(POST /auth/login, 명세서 2번)은 memberId를 내려주고,
 * 내 정보 조회 응답(GET /members/me, 명세서 4번)은 id를 내려준다 — 명세서 자체가 서로 다른
 * 키를 쓴다. 화면 코드에서 "이 user가 로그인 직후 온 건지 새로고침 복원인지"에 따라 다른
 * 필드를 참조하는 실수를 막기 위해, login() 시점에 id로 정규화해서 저장한다.
 */
function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, studentNumber, name, role, status }
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const me = await getMyInfo();
        setUser(me);
      } catch {
        // 토큰이 만료되었거나 유효하지 않음 — 로컬 정보 정리
        localStorage.removeItem("accessToken");
        localStorage.removeItem("memberId");
        localStorage.removeItem("role");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // 로그인 성공 직후 LoginPage에서 호출 — 서버 응답으로 받은 사용자 정보를 컨텍스트에 반영.
  // userInfo는 로그인 응답(memberId 필드)을 그대로 받으므로 id로 정규화해서 저장한다.
  const login = useCallback((accessToken, userInfo) => {
    const normalized = {
      ...userInfo,
      id: userInfo.id ?? userInfo.memberId,
    };
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("memberId", normalized.id);
    localStorage.setItem("role", normalized.role);
    setUser(normalized);
  }, []);

  // 마이페이지에서 이름 수정 등 내 정보 일부가 바뀌었을 때, 재로그인/새로고침 없이
  // 헤더 등 다른 화면에 즉시 반영되도록 컨텍스트의 user를 부분 갱신한다.
  const updateUser = useCallback((partial) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // 서버 로그아웃 실패해도 클라이언트 쪽 로그인 상태는 어차피 지운다
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("memberId");
      localStorage.removeItem("role");
      setUser(null);
    }
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export { AuthProvider, useAuth };
