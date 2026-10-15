import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import type { User } from "../types/auth";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): User | null {
  try {
    const stored = localStorage.getItem("auth_user");
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    localStorage.removeItem("auth_user");
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem("auth_token"));
  const [user, setUser] = useState<User | null>(() => {
    return readStoredUser();
  });
  const [isReady, setIsReady] = useState(false);

  function clearSession() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  }

  useEffect(() => {
    let active = true;
    const storedToken = localStorage.getItem("auth_token");
    if (!storedToken) {
      setIsReady(true);
      return;
    }

    api.get<{ user: User }>("/auth/me")
      .then((response) => {
        if (active) {
          setUser(response.data.user);
          localStorage.setItem("auth_user", JSON.stringify(response.data.user));
        }
      })
      .catch(() => { if (active) clearSession(); })
      .finally(() => { if (active) setIsReady(true); });

    const onExpired = () => clearSession();
    window.addEventListener("auth:expired", onExpired);
    return () => { active = false; window.removeEventListener("auth:expired", onExpired); };
  }, []);

  async function login(email: string, password: string) {
    const response = await api.post<{ token: string; user: User }>("/auth/login", {
      email,
      password
    });

    localStorage.setItem("auth_token", response.data.token);
    localStorage.setItem("auth_user", JSON.stringify(response.data.user));
    setToken(response.data.token);
    setUser(response.data.user);
  }

  function logout() {
    clearSession();
  }

  const value = useMemo(() => ({ user, token, isReady, login, logout }), [user, token, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
