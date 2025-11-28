"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Video, Image, File, Trash2, RefreshCw, Clock, CheckCircle2, AlertCircle, Loader2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getUserFiles, deleteFile, getFileStatus } from "@/lib/api";
import { UploadedFile, FileType } from "@/types";
import { formatDistanceToNow } from "date-fns";

const getFileIcon = (type: FileType) => {
  switch (type) {
    case "pdf":
      return <FileText className="h-5 w-5 text-red-400" />;
    case "txt":
      return <FileText className="h-5 w-5 text-neutral-400" />;
    case "csv":
      return <FileText className="h-5 w-5 text-green-400" />;
    case "video":
    case "audio":
      return <Video className="h-5 w-5 text-blue-400" />;
    case "image":
      return <Image className="h-5 w-5 text-green-400" />;
    case "ppt":
      return <FileText className="h-5 w-5 text-violet-400" />;
    case "docx":
      return <FileText className="h-5 w-5 text-blue-500" />;
    case "xlsx":
      return <FileText className="h-5 w-5 text-green-500" />;
    default:
      return <File className="h-5 w-5 text-gray-400" />;
  }
};

const getStatusBadge = (status: UploadedFile["status"]) => {
  switch (status) {
    case "uploading":
      return (
        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-0 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0">
          <Loader2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 animate-spin" />
          Uploading
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-0 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0">
          <Loader2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 animate-spin" />
          Processing
        </Badge>
      );
    case "ready":
      return (
        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0">
          <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
          Ready
        </Badge>
      );
    case "error":
      return (
        <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-0 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0">
          <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
          Error
        </Badge>
      );
  }
};

interface FileListProps {
  refreshTrigger?: number;
  onFileSelect?: (fileId: string) => void;
}

export function FileList({ refreshTrigger, onFileSelect }: FileListProps) {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleFileClick = (file: UploadedFile) => {
    if (file.status !== "ready") return;
    
    if (onFileSelect) {
      onFileSelect(file.id);
    } else {
      router.push(`/dashboard?file=${file.id}`);
    }
  };

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const data = await getUserFiles();
      setFiles(data);
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [refreshTrigger]);

  // Poll for processing files
  useEffect(() => {
    const processingFiles = files.filter((f) => f.status === "processing");
    if (processingFiles.length === 0) return;

    const interval = setInterval(async () => {
      for (const file of processingFiles) {
        try {
          const updated = await getFileStatus(file.id);
          if (updated.status !== file.status) {
            setFiles((prev) =>
              prev.map((f) => (f.id === file.id ? updated : f))
            );
          }
        } catch (error) {
          console.error("Failed to get file status:", error);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [files]);

  const handleDelete = async (fileId: string) => {
    try {
      setDeletingIds((prev) => new Set(prev).add(fileId));
      await deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (error) {
      console.error("Failed to delete file:", error);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="h-full bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="h-full bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-neutral-800">
        <h3 className="text-base sm:text-lg font-medium text-white">
          Your Files ({files.length})
        </h3>
        <button
          onClick={fetchFiles}
          className="flex items-center gap-1 text-xs sm:text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Refresh
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 sm:p-4">
        {files.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400 p-4">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 mb-3 opacity-50" />
            <p className="text-sm sm:text-base">No files uploaded yet</p>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 text-center">
              Upload documents to start chatting
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => handleFileClick(file)}
                className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-neutral-800/50 rounded-lg transition-colors group ${
                  file.status === "ready" 
                    ? "hover:bg-neutral-800 cursor-pointer hover:ring-1 hover:ring-emerald-500/50 active:bg-neutral-700" 
                    : "opacity-70"
                }`}
              >
                <div className="shrink-0">
                  {getFileIcon(file.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-white truncate">
                    {file.filename}
                  </p>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
                    {getStatusBadge(file.status)}
                    <span className="text-[10px] sm:text-xs text-neutral-500 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      {formatDistanceToNow(new Date(file.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                {file.status === "ready" && (
                  <div className="hidden sm:block p-2 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                )}
                <button
                  className="p-1.5 sm:p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.id);
                  }}
                  disabled={deletingIds.has(file.id)}
                >
                  {deletingIds.has(file.id) ? (
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
