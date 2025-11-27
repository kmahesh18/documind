"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatInterface } from "./chat-interface";
import { clearChatHistory } from "@/lib/api";

interface MobileChatSheetProps {
  fileId?: string;
  fileName?: string;
  userImage?: string;
  userName?: string;
}

export function MobileChatSheet({ fileId, fileName, userImage, userName }: MobileChatSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleClearChat = async () => {
    if (!fileId) return;
    try {
      await clearChatHistory(fileId);
      setChatKey(prev => prev + 1);
    } catch (err) {
      console.error("Failed to clear chat:", err);
    }
  };

  // Handle drag to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - dragStartY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (currentY > 150) {
      setIsOpen(false);
    }
    setCurrentY(0);
  };

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Floating Chat Button - Only visible on mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "md:hidden fixed bottom-6 right-6 z-40",
          "h-14 w-14 rounded-full",
          "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600",
          "shadow-lg shadow-emerald-500/30",
          "flex items-center justify-center",
          "transition-all duration-300",
          "animate-in fade-in zoom-in",
          isOpen && "opacity-0 pointer-events-none"
        )}
        aria-label="Open chat"
      >
        <MessageCircle className="h-6 w-6 text-black" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Sheet - Instagram style slide up */}
      <div
        ref={sheetRef}
        style={{
          transform: isOpen 
            ? `translateY(${currentY}px)` 
            : "translateY(100%)",
        }}
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-50",
          "h-[85vh] max-h-[85vh]",
          "bg-neutral-900 rounded-t-3xl",
          "border-t border-neutral-700",
          "flex flex-col",
          "transition-transform duration-300 ease-out",
          isDragging && "transition-none"
        )}
      >
        {/* Drag Handle */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1 rounded-full bg-neutral-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-neutral-800">
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold truncate">
              {fileName ? `Chat with ${fileName}` : "Chat"}
            </h2>
            <p className="text-xs text-neutral-500">Ask questions about your document</p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={handleClearChat}
              className="p-2 rounded-full text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
              title="Clear chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">
          {isOpen && (
            <ChatInterface
              key={chatKey}
              fileId={fileId}
              userImage={userImage}
              userName={userName}
            />
          )}
        </div>
      </div>
    </>
  );
}
