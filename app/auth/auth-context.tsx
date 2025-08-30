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
  const { updateUser, ...rest } = useBaseAuth()
  
  // CDP authentication - login and register are handled by the CDP hooks in the base context
  const login = async (email: string, password?: string) => {
    // The base auth context handles CDP authentication automatically
    // We don't need to do anything here as CDP manages the auth state
    console.log('Login requested for:', email)
  }
  
  const register = async (email: string, password?: string, displayName?: string) => {
    // The base auth context handles CDP authentication automatically
    // We don't need to do anything here as CDP manages the auth state
    console.log('Register requested for:', email, displayName)
  }
  
  return { ...rest, login, register, updateUser }
}
