"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  role: string | null;
  username: string | null;
  isLoading: boolean;
  login: (role: string, username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  role: null,
  username: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("username") : null;
    setRole(storedRole);
    setUsername(storedUser);
    setIsLoading(false);
  }, []);

  const login = (role: string, username: string) => {
    setRole(role);
    setUsername(username);
    localStorage.setItem("role", role);
    localStorage.setItem("username", username);
  };

  const logout = () => {
    setRole(null);
    setUsername(null);
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ role, username, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
