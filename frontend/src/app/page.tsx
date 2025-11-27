import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Brain, ArrowRight, FileText, MessageSquare, Zap } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const session = await getServerSession();
  
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center">
              <Brain className="h-8 w-8 text-black" />
            </div>
            <h1 className="text-5xl font-bold text-white">
              DocuMind
            </h1>
          </div>
          
          {/* Tagline */}
          <p className="text-xl md:text-2xl text-neutral-300 mb-6">
            Chat with your documents
          </p>
          <p className="text-lg text-neutral-500 mb-10 max-w-2xl mx-auto">
            Upload your PDFs, documents, images, and videos. Ask questions naturally 
            and get AI-powered answers with precise citations.
          </p>

          {/* CTA Button */}
          <Link 
            href="/auth/signin"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 
                       text-black font-semibold text-lg rounded-xl transition-all duration-200"
          >
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-24 max-w-5xl mx-auto">
          <FeatureCard
            icon={<FileText className="h-6 w-6 text-emerald-500" />}
            title="Multi-format Support"
            description="Upload PDFs, text files, images, and videos. We handle all your document types."
          />
          <FeatureCard
            icon={<MessageSquare className="h-6 w-6 text-emerald-500" />}
            title="Natural Chat Interface"
            description="Ask questions in plain English. Get answers with clickable citations."
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6 text-emerald-500" />}
            title="Lightning Fast RAG"
            description="Powered by Google Gemini and Pinecone for accurate, instant responses."
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-8">
        <div className="container mx-auto px-4 text-center text-neutral-500 text-sm">
          © 2025 DocuMind. Built with Next.js, FastAPI, and Gemini AI.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors">
      <div className="p-3 bg-neutral-800 rounded-lg w-fit mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-neutral-500 text-sm">{description}</p>
    </div>
  );
}
