"use client";

import { useState, useEffect } from "react";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface FileViewerProps {
  file: {
    id: string;
    filename: string;
    file_type: string;
    file_url: string;
    status: string;
  };
}

// File types that should use DocViewer (excluding spreadsheets now)
const DOC_VIEWER_TYPES = ["docx", "ppt", "pptx", "doc"];

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
    return <PDFViewer url={file_url} filename={filename} />;
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

  // CSV viewer using PapaParse
  if (file_type === "csv") {
    return <CSVViewer url={file_url} filename={filename} />;
  }

  // Excel viewer using xlsx library
  if (file_type === "xlsx" || file_type === "xls") {
    return <ExcelViewer url={file_url} filename={filename} />;
  }

  // Document viewer for DOCX, PPTX using react-doc-viewer
  if (DOC_VIEWER_TYPES.includes(file_type)) {
    return <DocumentViewer url={file_url} filename={filename} />;
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

// Document viewer component using react-doc-viewer (for DOCX, PPTX only)
function DocumentViewer({ url, filename }: { url: string; filename: string }) {
  const [error, setError] = useState(false);
  const docs = [{ uri: url, fileName: filename }];

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="w-16 h-16 bg-neutral-800 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-neutral-300">{filename}</p>
          <p className="text-neutral-500 text-sm mt-1">Preview failed to load</p>
          <a
            href={url}
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

  return (
    <div className="h-full w-full bg-neutral-950 flex flex-col">
      {/* Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <span className="text-neutral-400 text-sm truncate max-w-[200px]">{filename}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors"
          title="Download file"
        >
          <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      </div>

      {/* Document Container - full height with overflow auto for scrolling */}
      <div className="flex-1 doc-viewer-container overflow-auto">
        <DocViewer
          documents={docs}
          pluginRenderers={DocViewerRenderers}
          config={{
            header: {
              disableHeader: true,
              disableFileName: true,
            },
            pdfVerticalScrollByDefault: true,
            loadingRenderer: {
              overrideComponent: () => (
                <div className="h-full w-full flex items-center justify-center bg-neutral-950">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-neutral-300">Loading {filename}...</p>
                  </div>
                </div>
              ),
            },
            noRenderer: {
              overrideComponent: () => {
                setError(true);
                return null;
              },
            },
          }}
          style={{
            width: "100%",
            height: "100%",
            minHeight: "100%",
            backgroundColor: "#0a0a0a",
          }}
        />
      </div>
    </div>
  );
}

// CSV Viewer using PapaParse - fast and responsive
function CSVViewer({ url, filename }: { url: string; filename: string }) {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [visibleRows, setVisibleRows] = useState(100);

  useEffect(() => {
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        Papa.parse(text, {
          complete: (results) => {
            setData(results.data as string[][]);
            setLoading(false);
          },
          error: () => {
            setError(true);
            setLoading(false);
          },
        });
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [url]);

  const loadMore = () => {
    setVisibleRows((prev) => Math.min(prev + 100, data.length));
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-neutral-300">Loading {filename}...</p>
        </div>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <p className="text-neutral-300">{filename}</p>
          <p className="text-neutral-500 text-sm mt-1">Failed to load CSV</p>
          <a
            href={url}
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

  const headers = data[0] || [];
  const rows = data.slice(1, visibleRows + 1);
  const hasMore = data.length > visibleRows + 1;

  return (
    <div className="h-full w-full bg-neutral-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <span className="text-neutral-400 text-sm truncate">{filename}</span>
        <div className="flex items-center gap-3">
          <span className="text-neutral-500 text-xs">
            {data.length - 1} rows × {headers.length} cols
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors"
            title="Download file"
          >
            <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="bg-neutral-800 text-neutral-300 font-semibold px-3 py-2 text-left border-b border-neutral-700 w-12">
                #
              </th>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="bg-neutral-800 text-neutral-300 font-semibold px-3 py-2 text-left border-b border-neutral-700 whitespace-nowrap"
                >
                  {header || `Column ${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-neutral-800/50 transition-colors"
              >
                <td className="px-3 py-2 text-neutral-500 border-b border-neutral-800/50 text-xs">
                  {rowIndex + 1}
                </td>
                {headers.map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-3 py-2 text-neutral-300 border-b border-neutral-800/50 max-w-xs truncate"
                    title={row[colIndex] || ""}
                  >
                    {row[colIndex] || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {hasMore && (
          <div className="p-4 text-center">
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm transition-colors"
            >
              Load more rows ({data.length - visibleRows - 1} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Excel Viewer using xlsx library - fast and responsive
function ExcelViewer({ url, filename }: { url: string; filename: string }) {
  const [sheets, setSheets] = useState<{ name: string; data: string[][] }[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [visibleRows, setVisibleRows] = useState(100);

  useEffect(() => {
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        const workbook = XLSX.read(buffer, { type: "array" });
        const parsedSheets = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name];
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
          return { name, data };
        });
        setSheets(parsedSheets);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [url]);

  const loadMore = () => {
    setVisibleRows((prev) => Math.min(prev + 100, currentData.length));
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-neutral-300">Loading {filename}...</p>
        </div>
      </div>
    );
  }

  if (error || sheets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <p className="text-neutral-300">{filename}</p>
          <p className="text-neutral-500 text-sm mt-1">Failed to load Excel file</p>
          <a
            href={url}
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

  const currentData = sheets[activeSheet]?.data || [];
  const headers = currentData[0] || [];
  const rows = currentData.slice(1, visibleRows + 1);
  const hasMore = currentData.length > visibleRows + 1;

  return (
    <div className="h-full w-full bg-neutral-950 flex flex-col">
      {/* Header with sheet tabs */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              onClick={() => {
                setActiveSheet(index);
                setVisibleRows(100);
              }}
              className={`px-3 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                activeSheet === index
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="text-neutral-500 text-xs">
            {currentData.length - 1} rows
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors"
            title="Download file"
          >
            <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="bg-neutral-800 text-neutral-300 font-semibold px-3 py-2 text-left border-b border-neutral-700 w-12">
                #
              </th>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="bg-neutral-800 text-neutral-300 font-semibold px-3 py-2 text-left border-b border-neutral-700 whitespace-nowrap"
                >
                  {header || `Column ${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-neutral-800/50 transition-colors"
              >
                <td className="px-3 py-2 text-neutral-500 border-b border-neutral-800/50 text-xs">
                  {rowIndex + 1}
                </td>
                {headers.map((_, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-3 py-2 text-neutral-300 border-b border-neutral-800/50 max-w-xs truncate"
                    title={String(row[colIndex] ?? "")}
                  >
                    {String(row[colIndex] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {hasMore && (
          <div className="p-4 text-center">
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm transition-colors"
            >
              Load more rows ({currentData.length - visibleRows - 1} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// PDF Viewer Component - uses PDF.js viewer or Google Docs for reliable preview
function PDFViewer({ url, filename }: { url: string; filename: string }) {
  const [viewMode, setViewMode] = useState<"pdfjs" | "google" | "direct">("pdfjs");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // PDF.js viewer URL - Mozilla's hosted viewer
  const pdfjsViewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}`;
  
  // Google Docs viewer as fallback
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    if (viewMode === "pdfjs") {
      // Try Google Docs viewer as fallback
      setViewMode("google");
      setLoading(true);
    } else if (viewMode === "google") {
      // Try direct embed as last resort
      setViewMode("direct");
      setLoading(true);
    } else {
      setError(true);
    }
  };

  const getViewerUrl = () => {
    switch (viewMode) {
      case "pdfjs":
        return pdfjsViewerUrl;
      case "google":
        return googleViewerUrl;
      case "direct":
        return `${url}#toolbar=1&navpanes=0&scrollbar=1`;
      default:
        return pdfjsViewerUrl;
    }
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-400 mb-2">Failed to load PDF preview</p>
          <p className="text-neutral-500 text-sm mb-4">The PDF could not be displayed inline</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in New Tab
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-neutral-950">
      {/* Header with viewer options */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800 shrink-0">
        <span className="text-neutral-400 text-sm truncate max-w-[200px]">{filename}</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-neutral-800 rounded-md p-0.5">
            <button
              onClick={() => { setViewMode("pdfjs"); setLoading(true); setError(false); }}
              className={`px-2 py-1 text-xs rounded transition-colors ${viewMode === "pdfjs" ? "bg-emerald-600 text-white" : "text-neutral-400 hover:text-white"}`}
              title="PDF.js Viewer"
            >
              PDF.js
            </button>
            <button
              onClick={() => { setViewMode("google"); setLoading(true); setError(false); }}
              className={`px-2 py-1 text-xs rounded transition-colors ${viewMode === "google" ? "bg-emerald-600 text-white" : "text-neutral-400 hover:text-white"}`}
              title="Google Docs Viewer"
            >
              Google
            </button>
            <button
              onClick={() => { setViewMode("direct"); setLoading(true); setError(false); }}
              className={`px-2 py-1 text-xs rounded transition-colors ${viewMode === "direct" ? "bg-emerald-600 text-white" : "text-neutral-400 hover:text-white"}`}
              title="Direct Embed"
            >
              Direct
            </button>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors"
            title="Open in new tab"
          >
            <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
      
      {/* PDF container */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950 z-10">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-neutral-300">Loading PDF...</p>
              <p className="text-neutral-500 text-xs mt-1">Using {viewMode === "pdfjs" ? "PDF.js" : viewMode === "google" ? "Google Docs" : "Direct"} viewer</p>
            </div>
          </div>
        )}
        <iframe
          key={viewMode}
          src={getViewerUrl()}
          className="w-full h-full bg-neutral-900"
          title={filename}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      </div>
    </div>
  );
}
