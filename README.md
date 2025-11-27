# DocuMind

**Multimodal RAG Chatbot** — Chat with your documents, images, audio & video files.

## About

DocuMind lets you upload files and have natural conversations about their content. It uses RAG (Retrieval-Augmented Generation) to provide accurate, cited answers.

**Supported formats:** PDF, DOCX, TXT, PPTX, CSV, XLSX, Images, Audio, Video

## Architecture

```
Frontend (Next.js) → Backend (FastAPI) → Supabase (DB + Storage)
                            ↓
            ┌───────────────┼───────────────┐
            ↓               ↓               ↓
       Pinecone        Gemini LLM      Groq Whisper
      (Vectors)       (Chat + Vision)   (Audio/Video)
```

**How it works:**
1. File uploaded → Text extracted (Vision API for images, Whisper for audio/video)
2. Text chunked → Embedded locally (HuggingFace) → Stored in Pinecone
3. User query → Semantic search → Relevant chunks retrieved
4. Context + query sent to Gemini → Response with citations returned

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** FastAPI, Python
- **Database:** Supabase (PostgreSQL + Storage)
- **Vector DB:** Pinecone
- **Embeddings:** HuggingFace sentence-transformers (local, free)
- **LLM:** Google Gemini 2.5 Flash
- **Vision:** Gemini Vision API (image OCR)
- **Speech-to-Text:** Groq Whisper
- **Auth:** Google OAuth
- **Payments:** Razorpay

## Run Locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Required env vars:** `SUPABASE_URL`, `SUPABASE_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `PINECONE_API_KEY`, `JWT_SECRET`

## Features

- Multi-format document support
- Per-file chat with history
- Visual generation (charts, diagrams)
- Credit-based billing with Razorpay
