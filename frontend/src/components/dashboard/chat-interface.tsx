"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Bot, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { sendChatMessage, getChatHistory } from "@/lib/api";
import { ChatMessage } from "@/types";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { VisualRenderer, parseVisualFromContent, VisualData } from "./visual-renderer";
import { useCredits } from "@/contexts/credits-context";
import { BuyCreditsModal } from "@/components/credits";

interface ChatInterfaceProps {
  userImage?: string;
  userName?: string;
  fileId?: string;
}

// Extended message type with optional visual
interface ExtendedChatMessage extends ChatMessage {
  visual?: VisualData;
  credits_used?: number;
}

export function ChatInterface({ userImage, userName, fileId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [insufficientCredits, setInsufficientCredits] = useState(false);
  
  const { credits, updateCreditsLocally } = useCredits();
  
  // Refs for autoscroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Load chat history when fileId changes
  useEffect(() => {
    const loadHistory = async () => {
      if (!fileId) {
        setMessages([]);
        return;
      }
      
      setIsLoadingHistory(true);
      try {
        const response = await getChatHistory(fileId);
        const loadedMessages: ExtendedChatMessage[] = response.messages.map((msg: any) => {
          // Parse visual from content if exists
          const { text, visual } = parseVisualFromContent(msg.content);
          return {
            id: msg.id,
            role: msg.role,
            content: text,
            visual: visual || undefined,
            citations: msg.citations,
            created_at: msg.created_at,
          };
        });
        setMessages(loadedMessages);
      } catch (err) {
        console.error("Failed to load chat history:", err);
        setMessages([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadHistory();
  }, [fileId]);

  // Auto-scroll when messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !fileId) return;
    
    // Check credits before sending
    if (credits && credits.credits_balance < 1) {
      setInsufficientCredits(true);
      setShowBuyModal(true);
      return;
    }

    const userMessage: ExtendedChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setInsufficientCredits(false);

    try {
      const response = await sendChatMessage(userMessage.content, fileId);
      
      // Update credits balance locally for immediate feedback
      if (response.credits_remaining !== undefined) {
        updateCreditsLocally(response.credits_remaining);
      }
      
      // Parse visual (chart, diagram, etc.) from response if exists
      const { text, visual } = parseVisualFromContent(response.message);
      
      const assistantMessage: ExtendedChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: text,
        visual: visual || undefined,
        citations: response.citations,
        credits_used: response.credits_used,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      
      // Check if it's an insufficient credits error
      if (error.response?.status === 402) {
        setInsufficientCredits(true);
        setShowBuyModal(true);
        // Remove the user message since we couldn't process it
        setMessages((prev) => prev.slice(0, -1));
      } else {
        const errorMessage: ExtendedChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!fileId) {
    return (
      <div className="flex flex-col h-full bg-neutral-950">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-neutral-500">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a file to start chatting</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-950">
      {/* Chat Messages - Scrollable container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-full bg-emerald-500/10 mb-4">
              <Bot className="h-12 w-12 text-emerald-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Start a conversation
            </h3>
            <p className="text-neutral-500 max-w-sm">
              Ask questions about this document. Your chat history will be saved.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-emerald-600">
                      <Bot className="h-4 w-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl",
                    message.role === "user"
                      ? "bg-emerald-600 text-white px-4 py-3"
                      : "bg-neutral-800 text-neutral-100 px-4 py-3"
                  )}
                >
                  {/* Markdown content */}
                  <div className={cn(
                    "prose prose-sm max-w-none",
                    message.role === "user" 
                      ? "prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white prose-li:text-white"
                      : "prose-invert prose-p:text-neutral-100 prose-headings:text-white prose-strong:text-white prose-code:text-emerald-400 prose-code:bg-neutral-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-700 prose-li:text-neutral-100 prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline"
                  )}>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  
                  {/* Visual (chart, diagram, etc.) if present */}
                  {message.visual && (
                    <div className="mt-4 -mx-1">
                      <VisualRenderer visual={message.visual} />
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={userImage} />
                    <AvatarFallback className="bg-neutral-700">
                      {userName?.charAt(0) || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-emerald-600">
                    <Bot className="h-4 w-4 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-neutral-800 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - ChatGPT style */}
      <div className="p-3 md:p-4 border-t border-neutral-800 shrink-0">
        {/* Insufficient credits warning */}
        {insufficientCredits && (
          <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-sm text-amber-400">
              You're out of credits.{" "}
              <button
                onClick={() => setShowBuyModal(true)}
                className="underline hover:text-amber-300"
              >
                Buy more credits
              </button>{" "}
              to continue chatting.
            </span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-2 bg-neutral-800 border border-neutral-700 rounded-2xl p-2 focus-within:border-neutral-600 transition-colors">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about this document..."
              className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-transparent border-0 
                         text-white placeholder:text-neutral-500 focus-visible:ring-0 focus-visible:ring-offset-0
                         py-2 px-2 text-sm md:text-base"
              disabled={isLoading}
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              className={cn(
                "h-9 w-9 rounded-xl shrink-0 transition-all",
                input.trim() && !isLoading
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
              )}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
      
      {/* Buy Credits Modal */}
      <BuyCreditsModal open={showBuyModal} onOpenChange={setShowBuyModal} />
    </div>
  );
}
