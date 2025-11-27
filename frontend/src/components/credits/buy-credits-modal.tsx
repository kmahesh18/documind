"use client";

import { useState, useEffect } from "react";
import { X, Coins, Check, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  getCreditPackages,
  createPaymentOrder,
  verifyPayment,
  CreditPackage,
} from "@/lib/api";
import { useCredits } from "@/contexts/credits-context";
import { cn } from "@/lib/utils";

interface BuyCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function BuyCreditsModal({ open, onOpenChange }: BuyCreditsModalProps) {
  const { data: session } = useSession();
  const { refreshCredits } = useCredits();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load packages
  useEffect(() => {
    if (open) {
      loadPackages();
      loadRazorpayScript();
    }
  }, [open]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await getCreditPackages();
      setPackages(data);
    } catch (err) {
      setError("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    if (document.getElementById("razorpay-script")) return;

    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  };

  const handlePurchase = async (packageItem: CreditPackage) => {
    if (!session?.user) {
      setError("Please sign in to purchase credits");
      return;
    }

    setError(null);
    setSuccess(null);
    setPurchasing(packageItem.id);

    try {
      // Create order
      const order = await createPaymentOrder(packageItem.id);

      // Open Razorpay checkout
      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "DocuMind",
        description: `${packageItem.credits} Credits - ${packageItem.name}`,
        order_id: order.order_id,
        prefill: order.prefill,
        notes: order.notes,
        theme: {
          color: "#10b981",
        },
        handler: async (response: any) => {
          // Verify payment
          try {
            const result = await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            if (result.success) {
              setSuccess(`Successfully added ${packageItem.credits} credits!`);
              refreshCredits();
              setTimeout(() => {
                onOpenChange(false);
                setSuccess(null);
              }, 2000);
            } else {
              setError(result.message || "Payment verification failed");
            }
          } catch (err: any) {
            setError(err.response?.data?.detail || "Payment verification failed");
          }
          setPurchasing(null);
        },
        modal: {
          ondismiss: () => {
            setPurchasing(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create order");
      setPurchasing(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-2xl max-h-[90vh] bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Coins className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-white">Buy Credits</h2>
              <p className="text-xs sm:text-sm text-neutral-400">
                Choose a package
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-emerald-400">
              <Check className="h-4 w-4 shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={cn(
                    "relative p-3 sm:p-5 rounded-xl border-2 transition-all",
                    pkg.is_popular
                      ? "border-emerald-500 bg-emerald-500/5"
                      : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-600"
                  )}
                >
                  {/* Popular badge */}
                  {pkg.is_popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] sm:text-xs font-semibold rounded-full flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span className="hidden sm:inline">Most Popular</span>
                      <span className="sm:hidden">Popular</span>
                    </div>
                  )}

                  <div className="text-center mb-2 sm:mb-4">
                    <h3 className="text-sm sm:text-lg font-semibold text-white">
                      {pkg.name}
                    </h3>
                  </div>

                  <div className="text-center mb-2 sm:mb-4">
                    <div className="flex items-center justify-center gap-1">
                      <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                      <span className="text-xl sm:text-3xl font-bold text-white">
                        {pkg.credits.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-400">credits</p>
                  </div>

                  <div className="text-center mb-2 sm:mb-4">
                    <span className="text-lg sm:text-2xl font-bold text-emerald-400">
                      ₹{pkg.price_inr}
                    </span>
                  </div>

                  <button
                    onClick={() => handlePurchase(pkg)}
                    disabled={purchasing !== null}
                    className={cn(
                      "w-full py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium transition-all flex items-center justify-center gap-2",
                      pkg.is_popular
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-neutral-700 hover:bg-neutral-600 text-white",
                      purchasing !== null && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {purchasing === pkg.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Processing...</span>
                      </>
                    ) : (
                      "Buy"
                    )}
                  </button>

                  {/* Value indicator */}
                  <p className="text-center text-[10px] sm:text-xs text-neutral-500 mt-1 sm:mt-2">
                    ₹{(pkg.price_inr / pkg.credits * 100).toFixed(0)}/100
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-neutral-800/50 border-t border-neutral-800 shrink-0">
          <p className="text-[10px] sm:text-xs text-neutral-500 text-center">
            🔒 Secure payments by Razorpay
          </p>
        </div>
      </div>
    </div>
  );
}
