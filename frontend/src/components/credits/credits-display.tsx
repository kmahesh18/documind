"use client";

import { useState } from "react";
import { Coins, Plus, Loader2, AlertCircle } from "lucide-react";
import { useCredits } from "@/contexts/credits-context";
import { BuyCreditsModal } from "./buy-credits-modal";
import { cn } from "@/lib/utils";

interface CreditsDisplayProps {
  variant?: "default" | "compact" | "header";
  showBuyButton?: boolean;
  className?: string;
}

export function CreditsDisplay({
  variant = "default",
  showBuyButton = true,
  className,
}: CreditsDisplayProps) {
  const { credits, isLoading, error } = useCredits();
  const [showBuyModal, setShowBuyModal] = useState(false);

  // Show loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700">
          <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
          <span className="text-sm text-neutral-400">Loading...</span>
        </div>
      </div>
    );
  }

  // Show error state (still allow buying)
  if (error || !credits) {
    if (variant === "header") {
      return (
        <>
          <div className={cn("flex items-center gap-2", className)}>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700">
              <AlertCircle className="h-4 w-4 text-neutral-500" />
              <span className="text-sm text-neutral-400">--</span>
            </div>
            {showBuyButton && (
              <button
                onClick={() => setShowBuyModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Buy Credits</span>
              </button>
            )}
          </div>
          <BuyCreditsModal open={showBuyModal} onOpenChange={setShowBuyModal} />
        </>
      );
    }
    return null;
  }

  const balance = credits.credits_balance;
  const isLow = balance < 50;
  const isCritical = balance < 10;

  if (variant === "compact") {
    return (
      <>
        <button
          onClick={() => setShowBuyModal(true)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm font-medium transition-colors",
            isCritical
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : isLow
              ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30",
            className
          )}
        >
          <Coins className="h-3.5 w-3.5" />
          <span>{balance.toLocaleString()}</span>
        </button>
        <BuyCreditsModal open={showBuyModal} onOpenChange={setShowBuyModal} />
      </>
    );
  }

  if (variant === "header") {
    return (
      <>
        <div className={cn("flex items-center gap-2", className)}>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg",
              isCritical
                ? "bg-red-500/10 border border-red-500/30"
                : isLow
                ? "bg-amber-500/10 border border-amber-500/30"
                : "bg-neutral-800 border border-neutral-700"
            )}
          >
            <Coins
              className={cn(
                "h-4 w-4",
                isCritical
                  ? "text-red-400"
                  : isLow
                  ? "text-amber-400"
                  : "text-emerald-400"
              )}
            />
            <span
              className={cn(
                "text-sm font-semibold",
                isCritical
                  ? "text-red-400"
                  : isLow
                  ? "text-amber-400"
                  : "text-white"
              )}
            >
              {balance.toLocaleString()}
            </span>
          </div>
          {showBuyButton && (
            <button
              onClick={() => setShowBuyModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Buy Credits</span>
            </button>
          )}
        </div>
        <BuyCreditsModal open={showBuyModal} onOpenChange={setShowBuyModal} />
      </>
    );
  }

  // Default variant
  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between p-4 rounded-xl border",
          isCritical
            ? "bg-red-500/10 border-red-500/30"
            : isLow
            ? "bg-amber-500/10 border-amber-500/30"
            : "bg-neutral-900 border-neutral-800",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg",
              isCritical
                ? "bg-red-500/20"
                : isLow
                ? "bg-amber-500/20"
                : "bg-emerald-500/20"
            )}
          >
            <Coins
              className={cn(
                "h-5 w-5",
                isCritical
                  ? "text-red-400"
                  : isLow
                  ? "text-amber-400"
                  : "text-emerald-400"
              )}
            />
          </div>
          <div>
            <p className="text-sm text-neutral-400">Credits Balance</p>
            <p
              className={cn(
                "text-2xl font-bold",
                isCritical
                  ? "text-red-400"
                  : isLow
                  ? "text-amber-400"
                  : "text-white"
              )}
            >
              {balance.toLocaleString()}
            </p>
          </div>
        </div>
        {showBuyButton && (
          <button
            onClick={() => setShowBuyModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Buy Credits
          </button>
        )}
      </div>
      {isCritical && (
        <p className="mt-2 text-sm text-red-400 text-center">
          ⚠️ Your credits are running low! Purchase more to continue chatting.
        </p>
      )}
      <BuyCreditsModal open={showBuyModal} onOpenChange={setShowBuyModal} />
    </>
  );
}
