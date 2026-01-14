"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { ReactNode } from "react";

type AuthContextType = {
  user: any | null; // you can replace `any` with your User type
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    //fetch("http://localhost:8000/api/me", { credentials: "include" })
    fetch("https://not-a-smart-charger-app.onrender.com/api/me", { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data?.username ?? null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    //const res = await fetch("http://localhost:8000/api/login", {
    const res = await fetch("https://not-a-smart-charger-app.onrender.com/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });

    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();
    setUser(data.username);
  };

  // logout to be added on backend. In the meantime, token expiration works as automatic logout
  const logout = async () => {
    //await fetch("http://localhost:8000/api/logout", { credentials: "include" });
    await fetch("https://not-a-smart-charger-app.onrender.com/api/logout", { credentials: "include" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider");
  return context;
};
