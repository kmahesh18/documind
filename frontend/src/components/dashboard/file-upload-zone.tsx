"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Image, Video, File, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { uploadFile } from "@/lib/api";
import { cn } from "@/lib/utils";

interface FileWithPreview extends File {
  preview?: string;
}

interface UploadingFile {
  file: FileWithPreview;
  progress: number;
  status: "uploading" | "processing" | "complete" | "error";
  error?: string;
}

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
  "video/*": [".mp4", ".webm", ".mov", ".avi"],
  "audio/*": [".mp3", ".wav", ".m4a", ".ogg"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return <Image className="h-6 w-6 text-emerald-400" />;
  if (type.startsWith("video/")) return <Video className="h-6 w-6 text-blue-400" />;
  if (type === "application/pdf") return <FileText className="h-6 w-6 text-red-400" />;
  if (type === "application/vnd.ms-powerpoint" || type === "application/vnd.openxmlformats-officedocument.presentationml.presentation")
    return <FileText className="h-6 w-6 text-violet-400" />;
  if (type === "application/msword" || type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    return <FileText className="h-6 w-6 text-blue-400" />;
  if (type === "application/vnd.ms-excel" || type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    return <FileText className="h-6 w-6 text-green-500" />;
  if (type === "text/csv") return <FileText className="h-6 w-6 text-green-400" />;
  return <File className="h-6 w-6 text-neutral-400" />;
};

const getFileTypeLabel = (type: string) => {
  if (type.startsWith("image/")) return "Image";
  if (type.startsWith("video/")) return "Video";
  if (type.startsWith("audio/")) return "Audio";
  if (type === "application/pdf") return "PDF";
  if (type === "text/plain") return "Text";
  if (type === "text/csv") return "CSV";
  if (type === "application/vnd.ms-powerpoint" || type === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return "PPTX";
  if (type === "application/msword" || type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "DOCX";
  if (type === "application/vnd.ms-excel" || type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "XLSX";
  return "File";
};

interface FileUploadZoneProps {
  onUploadComplete?: () => void;
}

export function FileUploadZone({ onUploadComplete }: FileUploadZoneProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadingFile[] = acceptedFiles.map((file) => ({
      file: Object.assign(file, {
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }),
      progress: 0,
      status: "uploading" as const,
    }));

    setUploadingFiles((prev) => [...prev, ...newFiles]);

    for (let i = 0; i < newFiles.length; i++) {
      const fileData = newFiles[i];
      const fileIndex = uploadingFiles.length + i;

      try {
        await uploadFile(fileData.file, (progress) => {
          setUploadingFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex ? { ...f, progress, status: progress < 100 ? "uploading" : "processing" } : f
            )
          );
        });

        setUploadingFiles((prev) =>
          prev.map((f, idx) => (idx === fileIndex ? { ...f, status: "complete", progress: 100 } : f))
        );
      } catch (error) {
        setUploadingFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex
              ? { ...f, status: "error", error: error instanceof Error ? error.message : "Upload failed" }
              : f
          )
        );
      }
    }

    onUploadComplete?.();
  }, [uploadingFiles.length, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: 100 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setUploadingFiles((prev) => {
      const file = prev[index];
      if (file.file.preview) {
        URL.revokeObjectURL(file.file.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearCompleted = () => {
    setUploadingFiles((prev) => prev.filter((f) => f.status !== "complete"));
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "flex-1 border-2 border-dashed cursor-pointer transition-all duration-200 rounded-xl",
          "bg-neutral-900 hover:bg-neutral-800/50 border-neutral-700",
          isDragActive && "border-emerald-500 bg-emerald-500/10",
          "flex flex-col items-center justify-center p-4 sm:p-8 min-h-[200px] sm:min-h-[300px]"
        )}
      >
        <input {...getInputProps()} />
        <div
          className={cn(
            "p-3 sm:p-5 rounded-full mb-4 sm:mb-6 transition-colors",
            isDragActive ? "bg-emerald-500/20" : "bg-neutral-800"
          )}
        >
          <Upload className={cn("h-8 w-8 sm:h-10 sm:w-10", isDragActive ? "text-emerald-400" : "text-neutral-400")} />
        </div>
        <p className="text-base sm:text-xl font-medium text-white mb-1 sm:mb-2 text-center">
          {isDragActive ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-xs sm:text-sm text-neutral-400 mb-4 sm:mb-6">or click to browse</p>
        
        {/* File type badges - responsive grid */}
        <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 justify-center max-w-xs sm:max-w-sm">
          <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 border-0 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs justify-center">
            PDF
          </Badge>
          <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 border-0 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs justify-center">
            DOCX
          </Badge>
          <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 border-0 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs justify-center">
            XLSX
          </Badge>
          <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 border-0 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs justify-center">
            Images
          </Badge>
          <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 border-0 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs justify-center">
            Videos
          </Badge>
          <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 border-0 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs justify-center">
            Audio
          </Badge>
          <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 border-0 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs justify-center col-span-2 sm:col-span-1">
            PPT / PPTX
          </Badge>
        </div>
        <p className="text-[10px] sm:text-xs text-neutral-500 mt-3 sm:mt-4">Max file size: 100MB</p>
      </div>

      {/* Uploading Files List */}
      {uploadingFiles.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-white">Uploads ({uploadingFiles.length})</h3>
            {uploadingFiles.some((f) => f.status === "complete") && (
              <button 
                onClick={clearCompleted} 
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {uploadingFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg">
                {getFileIcon(file.file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-neutral-500">
                      {getFileTypeLabel(file.file.type)} • {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  {file.status === "uploading" && (
                    <div className="mt-2 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                  {file.status === "error" && (
                    <p className="text-xs text-red-400 mt-1">{file.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {file.status === "uploading" && (
                    <div className="flex items-center gap-1 text-neutral-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">{file.progress}%</span>
                    </div>
                  )}
                  {file.status === "processing" && (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Processing</span>
                    </div>
                  )}
                  {file.status === "complete" && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  )}
                  {file.status === "error" && (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
