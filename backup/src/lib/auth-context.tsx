import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "./agent-client";

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    if (t === "demo") {
      setAuth(true);
      setLoading(false);
      return;
    }
    api.me()
      .then(() => setAuth(true))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        login: async (password) => {
          // Demo bypass: lets you preview the UI without running the agent.
          if (password === "admin") {
            setToken("demo");
            setAuth(true);
            return;
          }
          const { token } = await api.login(password);
          setToken(token);
          setAuth(true);
        },
        logout: () => {
          setToken(null);
          setAuth(false);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
