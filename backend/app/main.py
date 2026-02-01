from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.routers import auth, files, chat, credits

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Multimodal RAG API for document understanding",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(files.router, prefix=settings.api_prefix)
app.include_router(chat.router, prefix=settings.api_prefix)
app.include_router(credits.router, prefix=settings.api_prefix)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    print(f"🚀 Starting {settings.app_name}...")
    print(f"☁️  File storage: Cloudinary")
    print(f"🗄️  MongoDB: {settings.mongodb_db_name}")
    

@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
