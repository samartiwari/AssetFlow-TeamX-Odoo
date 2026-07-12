import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Role = "EMPLOYEE" | "DEPT_HEAD" | "ASSET_MANAGER" | "ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type AuthContextValue = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Placeholder signed-in user so the shell and nav can be built before the real
// login flow exists. Replace this with the token-backed user once auth lands.
const PLACEHOLDER_USER: User = {
  id: "u-001",
  name: "Aarav Sharma",
  email: "aarav@assetflow.local",
  role: "ADMIN",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(PLACEHOLDER_USER);

  const value = useMemo(
    () => ({
      user,
      login: (u: User) => setUser(u),
      logout: () => setUser(null),
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
