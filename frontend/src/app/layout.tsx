import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CreditsProvider } from "@/contexts/credits-context";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DocuMind - Multimodal RAG Application",
  description: "Chat with your documents using AI-powered retrieval augmented generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Razorpay Checkout Script */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </head>
      <body className={`${inter.className} antialiased bg-black`}>
        <AuthProvider>
          <CreditsProvider>
            {children}
            <Toaster />
          </CreditsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
