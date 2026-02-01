<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Pinecone-000000?style=for-the-badge&logo=pinecone&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

<h1 align="center">📚 DocuMind</h1>

<p align="center">
  <strong>Intelligent Document Understanding with RAG (Retrieval-Augmented Generation)</strong>
</p>

<p align="center">
  Upload any document • Chat with your files • Get accurate, context-aware answers
</p>

---

## 🧠 What is RAG?

**Retrieval-Augmented Generation (RAG)** bridges the gap between what AI models know and what your documents contain.

Think of a large language model like a brilliant scholar locked inside a vast library that closed five years ago. It remembers every page but hasn't read a single new book since. RAG hands that scholar a new ability — to walk out, fetch the latest data, and respond with **current, evidence-backed information**.

### The Core Idea

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   QUERY     │ ──▶ │  RETRIEVE   │ ──▶ │   AUGMENT   │ ──▶ │  GENERATE   │
│             │     │  Relevant   │     │   Context   │     │   Answer    │
│ "What's the │     │  Documents  │     │   + Query   │     │  with Facts │
│  refund..." │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Why RAG Matters

| Without RAG | With RAG |
|------------|----------|
| "Refunds are typically available within 30 days." (generic guess) | "Refunds can be requested within 14 days of purchase, provided the license hasn't been activated." (from your actual policy) |

---

## 🔍 Naive vs Neural Retrieval

Every retrieval system walks the same line: **finding what's relevant**. The trick lies in how relevance is defined.

### Naive Retrieval (Keyword Matching)

```python
# TF-IDF based search - matches words, not meaning
query = "renewable energy from the sun"

# Results:
# ❌ "Solar panels convert sunlight into electricity" → 0.00 (no word overlap!)
# ✅ "Wind turbines generate renewable power" → 0.19 (matches "renewable")
```

**The curse:** Literal loyalty, semantic blindness.

### Neural Retrieval (Semantic Search)

```python
# Sentence embeddings - matches meaning
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')
query = "renewable energy from the sun"

# Results:
# ✅ "Solar panels convert sunlight into electricity" → 0.87 (understands solar = sun)
# ✅ "Wind turbines generate renewable power" → 0.55
```

**The magic:** No matching words, yet perfect understanding.

### Hybrid Approach (Best of Both)

DocuMind combines both for optimal results:

```python
def hybrid_score(bm25_score, vector_score, alpha=0.6):
    return alpha * vector_score + (1 - alpha) * bm25_score
```

---

## 💾 Vector Databases Explained

A model doesn't think in words. It thinks in **vectors** — numerical representations of meaning.

```python
# Text → Vector (384 dimensions)
"Solar panels convert sunlight" → [0.13, 0.72, -0.48, ..., 0.19]
"Renewable energy from sun"    → [0.15, 0.69, -0.45, ..., 0.21]
# Similar meaning = Close vectors in 384-dimensional space
```

### Why Traditional Databases Fail

```sql
-- Traditional SQL can't do this:
SELECT * FROM docs WHERE meaning SIMILAR TO 'vacation policy'

-- It can only do exact matches:
SELECT * FROM docs WHERE content LIKE '%vacation%'
```

### Vector Database (Pinecone) Solution

```python
# Semantic search with Pinecone
query_embedding = model.encode("time off policy")
results = index.query(vector=query_embedding, top_k=5)
# Returns: vacation policy, leave guidelines, PTO rules...
```

---

## 🏗️ Architecture

```
                                   ┌──────────────────────────────────┐
                                   │         DocuMind Frontend        │
                                   │          (Next.js 14)            │
                                   │    • Google OAuth (NextAuth)     │
                                   │    • File Upload UI              │
                                   │    • Chat Interface              │
                                   └─────────────┬────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DocuMind Backend (FastAPI)                          │
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   /auth     │  │   /files    │  │   /chat     │  │  /credits   │            │
│  │   Router    │  │   Router    │  │   Router    │  │   Router    │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                │                    │
│         ▼                ▼                ▼                ▼                    │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                         Services Layer                               │       │
│  │  • MongoDB Service (Users, Files, Chats, Credits)                   │       │
│  │  • RAG Service (LangChain + Pinecone)                               │       │
│  │  • Local Processor (PDF, DOCX, Images, Audio/Video)                 │       │
│  │  • Payment Service (Razorpay)                                       │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
           ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
           │   MongoDB    │     │   Pinecone   │     │  Cloudinary  │
           │   Atlas      │     │ Vector Store │     │  File Store  │
           │              │     │              │     │              │
           │ • Users      │     │ • Embeddings │     │ • PDFs       │
           │ • Files      │     │ • Semantic   │     │ • Images     │
           │ • Chats      │     │   Search     │     │ • Videos     │
           │ • Credits    │     │              │     │ • Audio      │
           └──────────────┘     └──────────────┘     └──────────────┘
```

---

## 🔄 The Complete RAG Pipeline

### Step 1: Indexing (Document Ingestion)

```python
from langchain.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import Pinecone

# 1. Load document
loader = PyPDFLoader("company_policy.pdf")
docs = loader.load()

# 2. Split into chunks (800 chars, 100 overlap)
splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
chunks = splitter.split_documents(docs)

# 3. Generate embeddings (FREE with local model)
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# 4. Store in Pinecone
vectorstore = Pinecone.from_documents(chunks, embeddings, index_name="documind")
```

### Step 2: Retrieval

```python
# User query
query = "What is the vacation policy?"

# Embed query
query_embedding = embeddings.embed_query(query)

# Semantic search (top 5 most relevant chunks)
results = vectorstore.similarity_search(query, k=5)
```

### Step 3: Augmentation

```python
# Build context-aware prompt
context = "\n\n".join([doc.page_content for doc in results])

prompt = f"""
You are a helpful assistant. Answer based ONLY on the context below.
If the information isn't in the context, say "I don't have that information."

Context:
{context}

Question: {query}

Answer:
"""
```

### Step 4: Generation

```python
import google.generativeai as genai

# Generate grounded response
response = genai.generate_text(prompt)
print(response.text)

# Output: "According to your company policy, employees are entitled 
# to 21 days of paid leave annually. Leave requests should be 
# submitted 2 weeks in advance..."
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS | Modern React UI |
| **Auth** | NextAuth.js + Google OAuth | Secure authentication |
| **Backend** | FastAPI (Python 3.11+) | High-performance API |
| **Database** | MongoDB Atlas | Document storage |
| **Vector DB** | Pinecone | Semantic search |
| **Embeddings** | Sentence Transformers (all-MiniLM-L6-v2) | Local, **FREE** embeddings |
| **LLM** | Google Gemini Pro | AI responses |
| **File Storage** | Cloudinary | Scalable file CDN |
| **Payments** | Razorpay | Credit system |
| **Deployment** | Docker + Render | Production hosting |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- MongoDB Atlas account
- Pinecone account
- Google Cloud Console (OAuth + Gemini API)
- Cloudinary account

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/documind.git
cd documind
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

**Configure `backend/.env`:**

```env
# App
APP_NAME=DocuMind API
API_PREFIX=/api

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net
MONGODB_DB_NAME=documind

# Security
JWT_SECRET=your-super-secret-jwt-key
JWT_ALGORITHM=HS256

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Pinecone Vector DB
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-environment
PINECONE_INDEX_NAME=documind

# Cloudinary File Storage
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Razorpay Payments
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
```

**Run backend:**

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env.local
```

**Configure `frontend/.env.local`:**

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:8000

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Run frontend:**

```bash
npm run dev
```

### 4. Initialize Database

```bash
cd backend
python setup_mongodb.py
```

Visit `http://localhost:3000` and sign in with Google!

---

## 🐳 Docker Deployment

### Local Development

```bash
# Build and run all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Production Optimizations

The Docker setup is optimized for **Render's free tier (512MB RAM)**:

```dockerfile
# Multi-stage build (minimal image)
FROM python:3.11-slim as builder
# ... build dependencies ...

FROM python:3.11-slim as production
# ... only runtime dependencies ...

# Gunicorn with memory-optimized settings
CMD ["gunicorn", "app.main:app",
    "--workers", "2",                    # 2 workers for 512MB
    "--worker-class", "uvicorn.workers.UvicornWorker",
    "--max-requests", "1000",            # Prevent memory leaks
    "--max-requests-jitter", "50",
    "--preload"]                         # Load models once in master
```

### Deploy to Render

1. **Create Web Service** for Backend:
   - Root Directory: `backend`
   - Environment: Docker
   - Add all environment variables from `.env`

2. **Create Web Service** for Frontend:
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

---

## 📂 Project Structure

```
documind/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py          # Environment settings
│   │   │   └── security.py        # JWT authentication
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic models
│   │   ├── routers/
│   │   │   ├── auth.py            # Google OAuth endpoints
│   │   │   ├── files.py           # File upload/management
│   │   │   ├── chat.py            # RAG chat endpoints
│   │   │   └── credits.py         # Credit system
│   │   ├── services/
│   │   │   ├── mongodb_service.py # Database operations
│   │   │   ├── langchain_rag.py   # RAG pipeline ⭐
│   │   │   ├── local_processor.py # Document processing
│   │   │   ├── credit_service.py  # Credit management
│   │   │   └── payment_service.py # Razorpay integration
│   │   └── main.py                # FastAPI app
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   ├── components/            # React components
│   │   ├── contexts/              # React contexts
│   │   ├── hooks/                 # Custom hooks
│   │   ├── lib/                   # Utilities
│   │   └── types/                 # TypeScript types
│   ├── Dockerfile
│   ├── package.json
│   └── .env.local
├── docker-compose.yml
└── README.md
```

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/google` | Google OAuth login |
| `GET` | `/api/auth/me` | Get current user |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/files/upload` | Upload document |
| `GET` | `/api/files` | List user files |
| `GET` | `/api/files/{id}` | Get file details |
| `DELETE` | `/api/files/{id}` | Delete file |

### Chat (RAG)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send message (RAG query) |
| `GET` | `/api/chat/history/{file_id}` | Get chat history |

### Credits

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/credits/balance` | Get credit balance |
| `GET` | `/api/credits/packages` | List credit packages |
| `POST` | `/api/credits/order` | Create payment order |
| `POST` | `/api/credits/verify` | Verify payment |

---

## 🧪 Example: RAG in Action

### 1. Upload Document

```bash
curl -X POST "http://localhost:8000/api/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@company_policy.pdf"
```

### 2. Ask Question

```bash
curl -X POST "http://localhost:8000/api/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_id": "abc123",
    "message": "What is the vacation policy?"
  }'
```

### 3. Response

```json
{
  "response": "According to your company policy, employees are entitled to 21 days of paid leave annually. Leave requests should be submitted at least 2 weeks in advance. Up to 5 days of unused leave can be carried forward to the next year.",
  "sources": [
    {"chunk": "Employees are entitled to 21 days...", "page": 12},
    {"chunk": "Leave requests must be submitted...", "page": 13}
  ]
}
```

---

## 💰 Credit System

| Action | Credits |
|--------|---------|
| Upload file | **Free** |
| Ask question | 1 credit |
| New users | **50 free credits** |

**Credit Packages (Razorpay):**

| Package | Credits | Price |
|---------|---------|-------|
| Starter | 100 | ₹99 |
| Pro | 500 | ₹399 |
| Enterprise | 2000 | ₹999 |

---

## 🔧 Environment Variables

### Backend (`.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `MONGODB_DB_NAME` | Database name | ✅ |
| `JWT_SECRET` | Secret for JWT tokens | ✅ |
| `GOOGLE_CLIENT_ID` | OAuth client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | OAuth secret | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key | ✅ |
| `PINECONE_API_KEY` | Pinecone API key | ✅ |
| `PINECONE_INDEX_NAME` | Pinecone index name | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ✅ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | ✅ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | ✅ |
| `RAZORPAY_KEY_ID` | Razorpay key ID | ✅ |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | ✅ |

### Frontend (`.env.local`)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | ✅ |
| `NEXTAUTH_URL` | Frontend URL | ✅ |
| `NEXTAUTH_SECRET` | NextAuth secret | ✅ |
| `GOOGLE_CLIENT_ID` | OAuth client ID | ✅ |
| `GOOGLE_CLIENT_SECRET` | OAuth secret | ✅ |

---

## 📈 Performance Optimization

### Memory Management (for Render 512MB)

```python
# Lazy load embedding model
class RAGService:
    def __init__(self):
        self._model = None
    
    def _get_model(self):
        if self._model is None:
            self._model = SentenceTransformer('all-MiniLM-L6-v2')
        return self._model
```

### Chunking Strategy

```python
# Optimal settings for most documents
splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,      # Not too small (loses context)
    chunk_overlap=100,   # Preserves continuity
    separators=["\n\n", "\n", ". ", " "]  # Natural breaks
)
```

### Retrieval Tuning

```python
# Start with k=5, adjust based on accuracy
results = vectorstore.similarity_search(query, k=5)

# For complex queries, try k=10
# For simple lookups, k=3 is enough
```

---

## 🛡️ Security

- ✅ JWT-based authentication
- ✅ Google OAuth 2.0
- ✅ User data isolation (files, chats)
- ✅ Non-root Docker containers
- ✅ Environment variable secrets
- ✅ CORS configuration

---

## 📚 Further Reading

- [RAG Paper (Lewis et al., 2020)](https://arxiv.org/abs/2005.11401)
- [LangChain Documentation](https://docs.langchain.com/)
- [Pinecone Vector Database](https://www.pinecone.io/learn/)
- [Sentence Transformers](https://www.sbert.net/)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ using RAG technology
</p>

<p align="center">
  <a href="#-documind">Back to top ↑</a>
</p>
