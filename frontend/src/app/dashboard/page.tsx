"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { ChatInterface } from "@/components/dashboard/chat-interface";
import { FileViewer } from "@/components/dashboard/file-viewer";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileChatSheet } from "@/components/dashboard/mobile-chat-sheet";
import { CreditsDisplay } from "@/components/credits";
import { getUserFiles, clearChatHistory } from "@/lib/api";
import { GripVertical, Upload, FileText, Menu, ChevronDown, Trash2, FileSpreadsheet, FileImage, FileVideo, FileAudio, File, Presentation } from "lucide-react";

interface FileData {
  id: string;
  filename: string;
  file_type: string;
  file_url: string;
  status: string;
}

// Helper function to get file icon based on type
const getFileIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  if (type.includes('pdf')) {
    return { icon: FileText, color: 'text-red-400' };
  } else if (type.includes('doc') || type.includes('word')) {
    return { icon: FileText, color: 'text-blue-400' };
  } else if (type.includes('xls') || type.includes('sheet') || type.includes('csv')) {
    return { icon: FileSpreadsheet, color: 'text-green-400' };
  } else if (type.includes('ppt') || type.includes('presentation')) {
    return { icon: Presentation, color: 'text-orange-400' };
  } else if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg') || type.includes('gif') || type.includes('webp')) {
    return { icon: FileImage, color: 'text-purple-400' };
  } else if (type.includes('video') || type.includes('mp4') || type.includes('webm') || type.includes('mov')) {
    return { icon: FileVideo, color: 'text-pink-400' };
  } else if (type.includes('audio') || type.includes('mp3') || type.includes('wav') || type.includes('ogg')) {
    return { icon: FileAudio, color: 'text-yellow-400' };
  }
  return { icon: File, color: 'text-gray-400' };
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const fileId = searchParams.get("file");
  
  const [activeFile, setActiveFile] = useState<FileData | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [chatKey, setChatKey] = useState(0); // For forcing chat refresh on clear
  
  // Resizable split state (desktop only)
  const [leftWidth, setLeftWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Clear chat handler
  const handleClearChat = async () => {
    if (!activeFile?.id) return;
    try {
      await clearChatHistory(activeFile.id);
      setChatKey(prev => prev + 1);
    } catch (err) {
      console.error("Failed to clear chat:", err);
    }
  };

  // Load files
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const data = await getUserFiles();
        setFiles(data);
        
        if (fileId) {
          const file = data.find((f: FileData) => f.id === fileId);
          if (file) setActiveFile(file);
        } else if (data.length > 0) {
          setActiveFile(data[0]);
        }
      } catch (err) {
        console.error("Failed to load files:", err);
      }
    };
    loadFiles();
  }, [fileId]);

  // Handle resize drag (desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    setLeftWidth(Math.min(80, Math.max(20, newWidth)));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

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

          {/* DocuMind Logo - Hidden on small mobile */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <FileText className="h-4 w-4 text-black" />
            </div>
            <span className="font-bold text-lg text-white">DocuMind</span>
          </div>

          {/* Divider - Hidden on mobile */}
          <div className="hidden sm:block h-6 w-px bg-neutral-700" />

          {/* File Selector - Modern dropdown for both mobile and desktop */}
          <div className="flex items-center gap-2 flex-1 min-w-0 relative">
            <FileText className="h-4 w-4 text-neutral-500 hidden sm:block" />
            
            {/* Custom dropdown button - works for all screen sizes */}
            <button
              onClick={() => setShowFileSelector(!showFileSelector)}
              className="flex items-center gap-2 bg-neutral-800/80 hover:bg-neutral-700/80 px-3 py-2 rounded-xl text-white text-sm max-w-[200px] md:max-w-xs border border-neutral-700/50 transition-all"
            >
              <span className="truncate">{activeFile?.filename || "Select file"}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${showFileSelector ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Upload Button */}
          <a
            href="/dashboard/upload"
            className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-500 px-3 md:px-4 py-1.5 rounded-lg text-white font-medium transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </a>

          {/* Credits Display */}
          <CreditsDisplay variant="header" />
        </div>

        {/* Mobile File Selector Dropdown - Modern curved design */}
        {showFileSelector && (
          <div className="absolute top-16 left-2 right-2 md:left-auto md:right-auto md:w-80 z-30 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/50 rounded-2xl shadow-2xl shadow-black/50 max-h-96 overflow-hidden"
               style={{ marginLeft: 'clamp(60px, 10vw, 140px)' }}>
            <div className="p-2">
              <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider px-3 py-2">
                Your Documents
              </p>
              <div className="max-h-72 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                {files.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <div className="h-12 w-12 rounded-xl bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-neutral-600" />
                    </div>
                    <p className="text-neutral-400 text-sm">No files uploaded</p>
                    <a 
                      href="/dashboard/upload"
                      className="text-emerald-500 text-sm hover:text-emerald-400 mt-1 inline-block"
                    >
                      Upload your first document
                    </a>
                  </div>
                ) : (
                  files.map((file) => {
                    const isActive = activeFile?.id === file.id;
                    const { icon: FileIcon, color: iconColor } = getFileIcon(file.file_type);
                    return (
                      <button
                        key={file.id}
                        onClick={() => {
                          setActiveFile(file);
                          setShowFileSelector(false);
                        }}
                        className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-3 rounded-xl transition-all duration-200 ${
                          isActive 
                            ? "bg-emerald-500/15 text-emerald-400" 
                            : "text-neutral-300 hover:bg-neutral-800/70 hover:text-white"
                        }`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-emerald-500/20' : 'bg-neutral-800/80'}`}>
                          <FileIcon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : iconColor}`} />
                        </div>
                        <span className="truncate flex-1">{file.filename}</span>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div 
          ref={containerRef}
          className="flex-1 flex p-1 md:p-2 gap-0 select-none overflow-hidden relative"
          onClick={() => setShowFileSelector(false)}
        >
          {/* MOBILE LAYOUT: Full width document viewer */}
          <div className="md:hidden flex-1 flex flex-col bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden h-full">
            {activeFile ? (
              <FileViewer file={activeFile} />
            ) : (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-neutral-600" />
                  </div>
                  <p className="text-neutral-400 mb-2">No file selected</p>
                  <a 
                    href="/dashboard/upload" 
                    className="text-emerald-500 hover:text-emerald-400 text-sm transition-colors"
                  >
                    Upload a document
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP LAYOUT: Split view */}
          {/* Left: File Viewer */}
          <div 
            style={{ width: `${leftWidth}%` }}
            className="hidden md:flex bg-neutral-900 rounded-l-xl border border-neutral-800 overflow-hidden flex-col h-full"
          >
            <div className="flex-1 bg-neutral-950 h-full">
              {activeFile ? (
                <FileViewer file={activeFile} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="h-16 w-16 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-neutral-600" />
                    </div>
                    <p className="text-neutral-400 mb-2">No file selected</p>
                    <a 
                      href="/dashboard/upload" 
                      className="text-emerald-500 hover:text-emerald-400 text-sm transition-colors"
                    >
                      Upload a document to get started
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resizable Divider - Desktop only */}
          <div
            onMouseDown={handleMouseDown}
            className={`hidden md:flex w-1 items-center justify-center cursor-col-resize group transition-colors ${
              isDragging ? "bg-emerald-500" : "bg-neutral-800 hover:bg-neutral-700"
            }`}
          >
            <div className={`p-1 rounded transition-colors ${
              isDragging ? "text-emerald-500" : "text-neutral-600 group-hover:text-neutral-400"
            }`}>
              <GripVertical className="h-4 w-4" />
            </div>
          </div>

          {/* Right: Chat - Desktop only */}
          <div 
            style={{ width: `${100 - leftWidth}%` }}
            className="hidden md:flex flex-col bg-neutral-900 rounded-r-xl border border-l-0 border-neutral-800 overflow-hidden"
          >
            {/* Chat header with clear button */}
            <div className="p-4 border-b border-neutral-800 bg-neutral-900/80 shrink-0 flex items-start justify-between">
              <div>
                <h1 className="text-lg font-semibold text-white">
                  {activeFile ? `Chat with ${activeFile.filename}` : "Select a document"}
                </h1>
                <p className="text-sm text-neutral-500 mt-1">
                  Ask questions about your document
                </p>
              </div>
              {activeFile && (
                <button
                  onClick={handleClearChat}
                  className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                  title="Clear chat history"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Chat interface */}
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                key={chatKey}
                fileId={activeFile?.id}
                userImage={session?.user?.image || undefined}
                userName={session?.user?.name || undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Chat Sheet - Instagram style */}
      <MobileChatSheet
        fileId={activeFile?.id}
        fileName={activeFile?.filename}
        userImage={session?.user?.image || undefined}
        userName={session?.user?.name || undefined}
      />
    </>
  );
}
