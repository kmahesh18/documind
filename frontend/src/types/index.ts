// User types
export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
}

// File types
export type FileType = 'pdf' | 'txt' | 'csv' | 'image' | 'video' | 'audio' | 'ppt' | 'docx' | 'doc' | 'xlsx' | 'xls';

export interface UploadedFile {
  id: string;
  user_id: string;
  filename: string;
  file_type: FileType;
  file_url: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

// Chat types
export interface Citation {
  source_url: string;
  file_type: FileType;
  filename: string;
  page_number?: number;
  timestamp?: number; // in seconds for video/audio
  text_snippet: string;
  relevance_score: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ChatResponse {
  message: string;
  citations: Citation[];
  session_id: string;
  credits_used?: number;
  credits_remaining?: number;
}

export interface FileUploadResponse {
  file_id: string;
  file_url: string;
  status: 'processing';
}
