"use client";

import { signIn } from "next-auth/react";
import { FileText, Brain, MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-neutral-950 flex-col justify-between p-12">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Brain className="h-6 w-6 text-black" />
              </div>
              <span className="text-2xl font-bold text-white">DocuMind</span>
            </Link>
          </div>
          
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">
                Chat with your documents <br />
                <span className="text-emerald-500">like never before.</span>
              </h1>
              <p className="text-neutral-400 text-lg">
                Upload any document and get instant AI-powered answers with precise citations.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-neutral-900/50 rounded-xl border border-neutral-800">
                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Multi-format Support</h3>
                  <p className="text-sm text-neutral-500">PDFs, Images, Videos, Audio & more</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-neutral-900/50 rounded-xl border border-neutral-800">
                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Powered by Gemini AI</h3>
                  <p className="text-sm text-neutral-500">Advanced RAG with precise citations</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-neutral-900/50 rounded-xl border border-neutral-800">
                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Natural Conversations</h3>
                  <p className="text-sm text-neutral-500">Ask questions in plain English</p>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-neutral-600 text-sm">
            © 2025 DocuMind. Built with Next.js, FastAPI, and Gemini AI.
          </p>
        </div>

        {/* Right Side - Sign In */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-10">
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <Brain className="h-7 w-7 text-black" />
                </div>
                <span className="text-3xl font-bold text-white">DocuMind</span>
              </Link>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
              <p className="text-neutral-500">Sign in to access your knowledge base</p>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 h-14 bg-white hover:bg-neutral-100 text-black font-medium rounded-xl transition-all duration-200 shadow-lg shadow-white/5"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-neutral-800"></div>
              <span className="text-neutral-600 text-sm">or</span>
              <div className="flex-1 h-px bg-neutral-800"></div>
            </div>

            <Link
              href="/"
              className="mt-6 w-full flex items-center justify-center gap-2 h-12 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 font-medium rounded-xl transition-all duration-200"
            >
              Back to Home
              <ArrowRight className="h-4 w-4" />
            </Link>

            <p className="text-center text-neutral-600 text-xs mt-8">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>

            {/* Mobile Features */}
            <div className="lg:hidden mt-10 pt-8 border-t border-neutral-800">
              <p className="text-sm text-neutral-500 mb-4 text-center">What you can do:</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <FileText className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-xs text-neutral-500">Upload Files</p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <Sparkles className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-xs text-neutral-500">AI Analysis</p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <MessageSquare className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-xs text-neutral-500">Chat</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
