"""
RAG Service - Uses FREE local embeddings (HuggingFace) + Gemini for chat only.

Architecture:
- Embeddings: sentence-transformers (all-MiniLM-L6-v2) - FREE, runs locally
- Vector DB: Pinecone
- Chat LLM: Gemini - Only called for final response generation (1 API call per message)
"""
from langchain_huggingface import HuggingFaceEmbeddings
import google.generativeai as genai
from pinecone import Pinecone
from typing import List, Optional, Tuple
import asyncio
from app.core.config import get_settings
from app.models.schemas import Citation

settings = get_settings()

# Initialize Pinecone and Gemini
pc = Pinecone(api_key=settings.pinecone_api_key)
genai.configure(api_key=settings.gemini_api_key)


def simple_text_splitter(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Simple text splitter - no external dependencies."""
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Try to break at natural boundaries
        if end < len(text):
            for sep in ["\n\n", "\n", ". ", " "]:
                last_sep = text[start:end].rfind(sep)
                if last_sep > chunk_size // 2:
                    end = start + last_sep + len(sep)
                    break
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        start = end - overlap if end < len(text) else len(text)
    
    return chunks


class LangChainRAGService:
    """
    RAG service using:
    - FREE local embeddings (HuggingFace sentence-transformers)
    - Pinecone for vector storage
    - Gemini ONLY for chat responses (1 API call per message)
    """

    def __init__(self):
        # FREE local embeddings - no API calls!
        # all-MiniLM-L6-v2 produces 384-dimensional vectors (matches your Pinecone)
        print("Loading local embedding model...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        print("Embedding model loaded!")
        
        # Gemini for chat only (using direct API, not LangChain wrapper)
        self.chat_model = genai.GenerativeModel("gemini-2.5-flash")
        
        # Pinecone index
        self.index = pc.Index(settings.pinecone_index_name)

    def embed_text(self, text: str) -> List[float]:
        """Generate embedding using LOCAL model - completely FREE!"""
        return self.embeddings.embed_query(text)
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed multiple documents - completely FREE!"""
        return self.embeddings.embed_documents(texts)

    async def process_and_store_document(
        self,
        text: str,
        file_id: str,
        user_id: str,
        filename: str,
        file_type: str,
        file_url: str = ""
    ) -> int:
        """
        Process document text and store in Pinecone.
        Uses FREE local embeddings - no API costs!
        """
        # Split text into chunks using simple splitter
        chunks = simple_text_splitter(text, chunk_size=500, overlap=50)
        print(f"Split into {len(chunks)} chunks")
        
        if not chunks:
            return 0
        
        # Generate embeddings locally (FREE!)
        print("Generating embeddings locally...")
        embeddings = self.embed_documents(chunks)
        print(f"Generated {len(embeddings)} embeddings")
        
        # Prepare vectors for Pinecone
        vectors = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            vectors.append({
                "id": f"{file_id}_{i}",
                "values": embedding,
                "metadata": {
                    "text": chunk,
                    "file_id": file_id,
                    "user_id": user_id,
                    "filename": filename,
                    "file_type": file_type,
                    "source_url": file_url,
                    "chunk_index": i
                }
            })
        
        # Upsert to Pinecone in batches
        batch_size = 100
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i:i + batch_size]
            self.index.upsert(vectors=batch)
            print(f"Upserted batch {i // batch_size + 1}")
        
        print(f"Stored {len(vectors)} vectors in Pinecone")
        return len(vectors)

    async def search_documents(
        self,
        query: str,
        file_id: Optional[str] = None,
        top_k: int = 5
    ) -> List[dict]:
        """
        Search Pinecone using LOCAL embeddings.
        Returns more chunks for better context.
        """
        # Generate query embedding locally (FREE!)
        query_embedding = self.embed_text(query)
        
        # Build filter
        filter_dict = None
        if file_id:
            filter_dict = {"file_id": {"$eq": file_id}}
        
        # Query Pinecone - get more results for better coverage
        results = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filter_dict
        )
        
        matches = results.get("matches", [])
        
        # Always try to include the first chunk (often has key info like names, titles)
        if file_id:
            first_chunk = self._get_first_chunk(file_id)
            if first_chunk:
                # Add first chunk if not already in results
                existing_ids = {m.get("id") for m in matches}
                if first_chunk.get("id") not in existing_ids:
                    matches.insert(0, first_chunk)
        
        return matches
    
    def _get_first_chunk(self, file_id: str) -> Optional[dict]:
        """Get the first chunk of a document (often contains important info)."""
        try:
            # Query with zero vector just to get chunks by metadata
            results = self.index.query(
                vector=[0.0] * 384,
                top_k=20,
                include_metadata=True,
                filter={"file_id": {"$eq": file_id}}
            )
            
            # Find chunk with index 0
            for match in results.get("matches", []):
                if match.get("metadata", {}).get("chunk_index") == 0:
                    return match
            return None
        except:
            return None

    def _format_context(self, matches: List[dict]) -> Tuple[str, List[Citation]]:
        """Format search results into context and citations, ordered by chunk index."""
        if not matches:
            return "", []
        
        # Sort by chunk_index so document reads in order
        sorted_matches = sorted(
            matches,
            key=lambda m: m.get("metadata", {}).get("chunk_index", 999)
        )
        
        context_parts = []
        citations = []
        
        for match in sorted_matches:
            meta = match.get("metadata", {})
            text = meta.get("text", "")
            filename = meta.get("filename", "Document")
            
            context_parts.append(text)
            
            citations.append(Citation(
                source_url=meta.get("source_url", ""),
                file_type=meta.get("file_type", "unknown"),
                filename=filename,
                page_number=meta.get("page_number"),
                text_snippet=text[:150] + "..." if len(text) > 150 else text,
                relevance_score=match.get("score", 0.0)
            ))
        
        return "\n\n".join(context_parts), citations

    async def chat(
        self,
        query: str,
        file_id: Optional[str] = None,
        chat_history: Optional[List[dict]] = None
    ) -> Tuple[str, List[Citation]]:
        """
        Chat with documents.
        - Embedding: FREE (local)
        - Gemini: 1 API call per message
        - Includes chat history for context
        """
        print(f"Query: {query}")
        
        # Search with LOCAL embeddings (FREE!) - get more chunks for better context
        matches = await self.search_documents(query, file_id, top_k=8)
        
        if not matches:
            return "No document content found. Please upload a document first.", []
        
        context, citations = self._format_context(matches)
        print(f"Found {len(matches)} relevant chunks")
        
        # Format chat history
        history_text = ""
        if chat_history and len(chat_history) > 0:
            history_parts = []
            for msg in chat_history:
                role = "User" if msg["role"] == "user" else "Assistant"
                history_parts.append(f"{role}: {msg['content']}")
            history_text = "\n".join(history_parts)
        
        # Build prompt with history
        prompt = f"""You are a helpful document assistant with visual generation capabilities. Answer based on the document content provided.

DOCUMENT CONTENT:
{context}

{"CONVERSATION HISTORY:" + chr(10) + history_text + chr(10) if history_text else ""}
USER QUESTION: {query}

INSTRUCTIONS:
- Answer using ONLY the document content above
- Consider the conversation history for context
- Look for synonyms (birthday = DOB, name = title, etc.)
- If the user says "in detail" or "explain", give a comprehensive answer
- If asked about something not in the document, say so clearly
- Use markdown formatting for better readability

===== VISUAL GENERATION (VERY IMPORTANT!) =====

When the user asks for visual representation, diagram, chart, graph, flowchart, visualization, explain visually, show as diagram, concept map, etc., you MUST generate a JSON code block.

Choose the BEST visual type for the content:

1. **CONCEPT MAP** - For explaining topics with multiple related concepts:
```json
{{
  "visual_type": "concept_map",
  "title": "Topic Overview",
  "central_concept": "Main Topic Name",
  "branches": [
    {{
      "topic": "Subtopic 1",
      "description": "Brief explanation",
      "subtopics": [
        {{"name": "Detail A", "detail": "More info"}},
        {{"name": "Detail B", "detail": "More info"}}
      ]
    }},
    {{
      "topic": "Subtopic 2",
      "description": "Brief explanation"
    }}
  ]
}}
```

2. **FLOWCHART** - For processes, steps, sequences:
```json
{{
  "visual_type": "flowchart",
  "title": "Process Name",
  "direction": "vertical",
  "nodes": [
    {{"id": "1", "label": "Step 1", "type": "start", "description": "What happens"}},
    {{"id": "2", "label": "Step 2", "type": "process", "description": "Details"}},
    {{"id": "3", "label": "Step 3", "type": "end"}}
  ]
}}
```

3. **HIERARCHY** - For organizational structures, classifications:
```json
{{
  "visual_type": "hierarchy",
  "title": "Structure",
  "root": {{
    "label": "Top Level",
    "children": [
      {{"label": "Category 1", "children": [{{"label": "Item A"}}, {{"label": "Item B"}}]}},
      {{"label": "Category 2"}}
    ]
  }}
}}
```

4. **TIMELINE** - For events, history, sequences:
```json
{{
  "visual_type": "timeline",
  "title": "Timeline of Events",
  "events": [
    {{"label": "Event 1", "date": "When", "description": "What happened"}},
    {{"label": "Event 2", "date": "When", "description": "What happened"}}
  ]
}}
```

5. **CHART** - For numerical data, statistics, comparisons with numbers:
```json
{{
  "visual_type": "chart",
  "chart_type": "bar",
  "title": "Data Title",
  "data_points": [
    {{"label": "Category 1", "value": 100}},
    {{"label": "Category 2", "value": 200}}
  ]
}}
```

6. **COMPARISON** - For comparing multiple items:
```json
{{
  "visual_type": "comparison",
  "title": "Comparison",
  "items": [
    {{"name": "Item A", "properties": {{"Feature 1": "Value", "Feature 2": "Value"}}}},
    {{"name": "Item B", "properties": {{"Feature 1": "Value", "Feature 2": "Value"}}}}
  ]
}}
```

RULES:
- ALWAYS use concept_map for educational/explanatory content about topics
- Use flowchart for processes and sequences
- Use hierarchy for structures and classifications
- Use chart ONLY when you have actual numerical data
- Extract REAL content from the document - don't make things up
- Keep 3-8 branches/nodes for readability
- Add a brief text explanation AFTER the JSON block

ANSWER:"""

        try:
            response = await asyncio.to_thread(
                self.chat_model.generate_content,
                prompt
            )
            return response.text, citations
            
        except Exception as e:
            print(f"Chat error: {e}")
            if "429" in str(e):
                return "Rate limited. Please wait a moment and try again.", []
            raise


# Singleton instance
_rag_service = None

def get_rag_service() -> LangChainRAGService:
    """Get or create RAG service singleton."""
    global _rag_service
    if _rag_service is None:
        _rag_service = LangChainRAGService()
    return _rag_service