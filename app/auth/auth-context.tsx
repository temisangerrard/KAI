"use client"

import React from "react"
import {
  AuthProvider as BaseAuthProvider,
  useAuth as useBaseAuth,
} from "@/lib/auth/auth-context"
export type { AuthUser as User } from "@/lib/auth/auth-service"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <BaseAuthProvider>{children}</BaseAuthProvider>
}

export function useAuth() {
  const { login: baseLogin, register: baseRegister, updateUser, ...rest } = useBaseAuth()
  const login = (email: string, password: string) => baseLogin({ email, password })
  const register = (email: string, password: string, displayName: string) =>
    baseRegister({ email, password, displayName })
  return { ...rest, login, register, updateUser }
}
