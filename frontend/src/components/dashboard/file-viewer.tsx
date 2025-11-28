"use client";

import { useState, useEffect } from "react";

interface FileViewerProps {
  file: {
    id: string;
    filename: string;
    file_type: string;
    file_url: string;
    status: string;
  };
}

export function FileViewer({ file }: FileViewerProps) {
  const { filename, file_type, file_url, status } = file;

  // Show loading state for processing files
  if (status === "processing") {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-neutral-300">Processing {filename}...</p>
          <p className="text-neutral-500 text-sm">This may take a moment</p>
        </div>
      </div>
    );
  }

  // PDF viewer
  if (file_type === "pdf") {
    return (
      <iframe
        src={`${file_url}#toolbar=0`}
        className="w-full h-full bg-neutral-950"
        title={filename}
      />
    );
  }

  // Image viewer
  if (file_type === "image") {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-neutral-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file_url}
          alt={filename}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>
    );
  }

  // Text file viewer
  if (file_type === "txt") {
    return <TextViewer url={file_url} />;
  }

  // Video viewer
  if (file_type === "video") {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <video
          src={file_url}
          controls
          className="max-w-full max-h-full"
        >
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // Audio viewer
  if (file_type === "audio") {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-12 h-12 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <p className="text-neutral-200 mb-4">{filename}</p>
          <audio src={file_url} controls className="w-full max-w-md" />
        </div>
      </div>
    );
  }

  // PPT / PPTX viewer (fallback)
  if (file_type === "ppt") {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="w-16 h-16 bg-neutral-800 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="1.5" />
              <path d="M14 2v6h6" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="text-neutral-300">{filename}</p>
          <p className="text-neutral-500 text-sm mt-1">Slide preview not available</p>
          <a
            href={file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm transition-colors"
          >
            Open Presentation
          </a>
        </div>
      </div>
    );
  }

  // DOCX viewer (fallback)
  if (file_type === "docx") {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="w-16 h-16 bg-neutral-800 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="1.5" />
              <path d="M14 2v6h6" strokeWidth="1.5" />
              <path d="M16 13H8M16 17H8M10 9H8" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="text-neutral-300">{filename}</p>
          <p className="text-neutral-500 text-sm mt-1">Document preview not available</p>
          <a
            href={file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm transition-colors"
          >
            Open Document
          </a>
        </div>
      </div>
    );
  }

  // XLSX viewer (fallback)
  if (file_type === "xlsx") {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="w-16 h-16 bg-neutral-800 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="1.5" />
              <path d="M14 2v6h6" strokeWidth="1.5" />
              <path d="M8 13h8M8 17h8M8 9h2" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="text-neutral-300">{filename}</p>
          <p className="text-neutral-500 text-sm mt-1">Spreadsheet preview not available</p>
          <a
            href={file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm transition-colors"
          >
            Open Spreadsheet
          </a>
        </div>
      </div>
    );
  }

  // Fallback for unsupported types
  return (
    <div className="h-full flex items-center justify-center bg-neutral-950">
      <div className="text-center">
        <div className="w-16 h-16 bg-neutral-800 rounded-lg flex items-center justify-center mb-4 mx-auto">
          <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-neutral-300">{filename}</p>
        <p className="text-neutral-500 text-sm mt-1">Preview not available</p>
        <a
          href={file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm transition-colors"
        >
          Download File
        </a>
      </div>
    </div>
  );
}

// Text file viewer component
function TextViewer({ url }: { url: string }) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setContent("Failed to load file content");
        setLoading(false);
      });
  }, [url]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 overflow-auto bg-neutral-950">
      <pre className="text-neutral-300 text-sm whitespace-pre-wrap font-mono">
        {content}
      </pre>
    </div>
  );
}
