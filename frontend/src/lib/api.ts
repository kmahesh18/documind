import axios from 'axios';
import { ChatResponse, FileUploadResponse, UploadedFile } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// File Management APIs
export const uploadFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<FileUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });

  return response.data;
};

export const getUserFiles = async (): Promise<UploadedFile[]> => {
  const response = await api.get('/api/files');
  return response.data;
};

export const getFileStatus = async (fileId: string): Promise<UploadedFile> => {
  const response = await api.get(`/api/files/${fileId}`);
  return response.data;
};

export const deleteFile = async (fileId: string): Promise<void> => {
  await api.delete(`/api/files/${fileId}`);
};

// Chat APIs
export const sendChatMessage = async (
  message: string,
  fileId: string  // Required now
): Promise<ChatResponse> => {
  const response = await api.post('/api/chat', {
    message,
    file_id: fileId,
  });
  return response.data;
};

export const getChatHistory = async (fileId: string) => {
  const response = await api.get(`/api/chat/history/${fileId}`);
  return response.data;
};

export const clearChatHistory = async (fileId: string) => {
  const response = await api.delete(`/api/chat/history/${fileId}`);
  return response.data;
};

// Auth APIs
export const verifyGoogleToken = async (token: string) => {
  const response = await api.post('/api/auth/google', { token });
  return response.data;
};

// Credits APIs
export interface UserCredits {
  credits_balance: number;
  total_purchased: number;
  total_used: number;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_inr: number;
  price_usd?: number;
  description?: string;
  is_popular: boolean;
}

export interface PaymentOrder {
  order_id: string;
  amount: number;
  amount_inr: number;
  currency: string;
  credits: number;
  package_name: string;
  key_id: string;
  prefill: {
    name: string;
    email: string;
  };
  notes: Record<string, string>;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  description?: string;
  created_at: string;
}

export const getCreditsBalance = async (): Promise<UserCredits> => {
  const response = await api.get('/api/credits/balance');
  return response.data;
};

export const getCreditPackages = async (): Promise<CreditPackage[]> => {
  const response = await api.get('/api/credits/packages');
  return response.data;
};

export const createPaymentOrder = async (packageId: string): Promise<PaymentOrder> => {
  const response = await api.post('/api/credits/order', { package_id: packageId });
  return response.data;
};

export const verifyPayment = async (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<{ success: boolean; message: string; new_balance: number }> => {
  const response = await api.post('/api/credits/verify', {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  });
  return response.data;
};

export const getCreditTransactions = async (
  limit: number = 20,
  offset: number = 0
): Promise<CreditTransaction[]> => {
  const response = await api.get('/api/credits/transactions', {
    params: { limit, offset },
  });
  return response.data;
};

export default api;
