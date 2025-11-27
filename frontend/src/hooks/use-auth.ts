"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

interface ExtendedSession {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  backendToken?: string;
  accessToken?: string;
}

export function useAuth() {
  const { data: session, status } = useSession();
  const extendedSession = session as ExtendedSession | null;

  useEffect(() => {
    // Store the backend token in localStorage when session changes
    if (extendedSession?.backendToken) {
      localStorage.setItem("auth_token", extendedSession.backendToken);
    }
  }, [extendedSession?.backendToken]);

  return {
    session: extendedSession,
    status,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    token: extendedSession?.backendToken,
  };
}
