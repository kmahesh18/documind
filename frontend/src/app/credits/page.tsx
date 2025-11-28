"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Coins,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  Loader2,
  Plus,
  History,
  CreditCard,
} from "lucide-react";
import { getCreditTransactions, CreditTransaction } from "@/lib/api";
import { useCredits } from "@/contexts/credits-context";
import { BuyCreditsModal } from "@/components/credits";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function CreditsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { credits, isLoading: creditsLoading } = useCredits();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const data = await getCreditTransactions(50);
      setTransactions(data);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "signup_bonus":
        return <Package className="h-4 w-4 text-emerald-400" />;
      case "purchase":
        return <CreditCard className="h-4 w-4 text-blue-400" />;
      case "chat_usage":
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      case "refund":
        return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      default:
        return <Coins className="h-4 w-4 text-neutral-400" />;
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount >= 0 ? "text-emerald-400" : "text-red-400";
  };

  if (status === "loading" || creditsLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center gap-3 md:gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-semibold text-white">Credits</h1>
            <p className="text-xs md:text-sm text-neutral-400 truncate">
              Manage credits and view history
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 md:px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Credits Balance Card */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-neutral-800 rounded-2xl p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-3 md:p-4 bg-emerald-500/20 rounded-xl">
                <Coins className="h-6 w-6 md:h-8 md:w-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-neutral-400">Current Balance</p>
                <p className="text-3xl md:text-4xl font-bold text-white">
                  {credits?.credits_balance.toLocaleString() || 0}
                </p>
                <p className="text-xs md:text-sm text-neutral-500">credits</p>
              </div>
            </div>
            <button
              onClick={() => setShowBuyModal(true)}
              className="flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors text-sm md:text-base"
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
              Buy More Credits
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 md:p-5">
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
              <span className="text-xs md:text-sm text-neutral-400 hidden sm:inline">Total Purchased</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-white">
              {credits?.total_purchased.toLocaleString() || 0}
            </p>
            <p className="text-xs text-neutral-500 sm:hidden">Purchased</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 md:p-5">
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-red-400" />
              <span className="text-xs md:text-sm text-neutral-400 hidden sm:inline">Total Used</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-white">
              {credits?.total_used.toLocaleString() || 0}
            </p>
            <p className="text-xs text-neutral-500 sm:hidden">Used</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 md:p-5">
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <Package className="h-4 w-4 md:h-5 md:w-5 text-emerald-400" />
              <span className="text-xs md:text-sm text-neutral-400 hidden sm:inline">Free Bonus</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-white">100</p>
            <p className="text-xs text-neutral-500 sm:hidden">Free</p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-neutral-800 flex items-center gap-3">
            <History className="h-5 w-5 text-neutral-400" />
            <h2 className="text-lg font-semibold text-white">
              Transaction History
            </h2>
          </div>

          {loadingTransactions ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <Coins className="h-12 w-12 text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-400">No transactions yet</p>
              <p className="text-sm text-neutral-500 mt-1">
                Your credit transactions will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 flex items-center justify-between hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-neutral-800 rounded-lg">
                      {getTransactionIcon(tx.transaction_type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {tx.description || tx.transaction_type.replace("_", " ")}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Calendar className="h-3 w-3 text-neutral-500" />
                        <span className="text-xs text-neutral-500">
                          {formatDistanceToNow(new Date(tx.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-lg font-semibold",
                        getTransactionColor(tx.amount)
                      )}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {tx.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Balance: {tx.balance_after.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage Info */}
        <div className="bg-neutral-800/30 border border-neutral-800 rounded-xl p-4 md:p-5">
          <h3 className="font-medium text-white mb-3">How Credits Work</h3>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">•</span>
              Each chat message costs 1 credit - simple and transparent
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">•</span>
              New users receive 100 free credits on signup
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">•</span>
              Ask unlimited questions with your documents
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">•</span>
              Credits never expire - use them whenever you need
            </li>
          </ul>
        </div>
      </div>

      {/* Buy Credits Modal */}
      <BuyCreditsModal open={showBuyModal} onOpenChange={setShowBuyModal} />
    </div>
  );
}
