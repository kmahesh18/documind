"use client";

import { useState } from "react";
import { FileUploadZone } from "@/components/dashboard/file-upload-zone";
import { FileList } from "@/components/dashboard/file-list";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Upload, FolderOpen, Menu, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function UploadPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleUploadComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="h-screen flex flex-col">
        {/* Top Header Bar */}
        <div className="h-14 border-b border-neutral-800 bg-neutral-900 flex items-center px-3 md:px-4 gap-2 md:gap-4 shrink-0">
          {/* Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* DocuMind Logo - Hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <FileText className="h-4 w-4 text-black" />
            </div>
            <span className="font-bold text-lg text-white">DocuMind</span>
          </div>

          {/* Divider - Hidden on mobile */}
          <div className="hidden sm:block h-6 w-px bg-neutral-700" />

          {/* Page Title */}
          <div className="flex items-center gap-2 flex-1">
            <Upload className="h-4 w-4 text-emerald-500" />
            <span className="text-white font-medium text-sm md:text-base">Upload Documents</span>
          </div>

          {/* Back to Dashboard - Mobile */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-3 md:p-6 flex flex-col overflow-hidden">
          {/* Description - Smaller on mobile */}
          <p className="text-neutral-400 mb-4 md:mb-6 text-sm md:text-base">
            Upload PDFs, text files, images, audio or videos to build your knowledge base
          </p>

          {/* Main Content - Stack on mobile, grid on desktop */}
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-4 md:gap-6 min-h-0 overflow-auto lg:overflow-hidden">
            {/* Upload Zone */}
            <div className="flex flex-col min-h-[250px] lg:min-h-0">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Upload className="h-4 w-4 text-neutral-500" />
                <h2 className="text-xs md:text-sm font-medium text-neutral-400 uppercase tracking-wide">Drop Files</h2>
              </div>
              <div className="flex-1 min-h-0">
                <FileUploadZone onUploadComplete={handleUploadComplete} />
              </div>
            </div>

            {/* File List */}
            <div className="flex flex-col min-h-[300px] lg:min-h-0">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <FolderOpen className="h-4 w-4 text-neutral-500" />
                <h2 className="text-xs md:text-sm font-medium text-neutral-400 uppercase tracking-wide">Your Files</h2>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <FileList refreshTrigger={refreshTrigger} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
