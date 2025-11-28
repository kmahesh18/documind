"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getCreditsBalance, UserCredits } from "@/lib/api";

interface CreditsContextType {
  credits: UserCredits | null;
  isLoading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
  updateCreditsLocally: (newBalance: number) => void;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCredits = useCallback(async () => {
    if (status !== "authenticated") return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getCreditsBalance();
      setCredits(data);
    } catch (err: unknown) {
      console.error("Failed to fetch credits:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load credits";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  // Update credits locally (for immediate UI feedback after chat)
  const updateCreditsLocally = useCallback((newBalance: number) => {
    setCredits((prev) =>
      prev
        ? { ...prev, credits_balance: newBalance }
        : { credits_balance: newBalance, total_purchased: 0, total_used: 0 }
    );
  }, []);

  // Fetch credits when authenticated
  useEffect(() => {
    if (status === "authenticated") {
      refreshCredits();
    } else if (status === "unauthenticated") {
      setCredits(null);
    }
  }, [status, refreshCredits]);

  return (
    <CreditsContext.Provider
      value={{
        credits,
        isLoading,
        error,
        refreshCredits,
        updateCreditsLocally,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error("useCredits must be used within a CreditsProvider");
  }
  return context;
}
