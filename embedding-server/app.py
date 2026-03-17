"""Lightweight embedding server using sentence-transformers (all-MiniLM-L6-v2).

Exposes POST /embed endpoint for single or batch text-to-embedding conversion.
Model: all-MiniLM-L6-v2 — 384 dimensions, ~90MB RAM, fast inference.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import uvicorn

app = FastAPI(title="Vibe Coder Embedding Server")

# Load model at startup (downloaded on first run, cached afterwards)
model = SentenceTransformer("all-MiniLM-L6-v2")


class EmbedRequest(BaseModel):
    text: str | None = None
    texts: list[str] | None = None


class EmbedResponse(BaseModel):
    embedding: list[float] | None = None
    embeddings: list[list[float]] | None = None


@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest) -> EmbedResponse:
    if request.text is not None:
        vec = model.encode(request.text).tolist()
        return EmbedResponse(embedding=vec)
    elif request.texts is not None:
        if len(request.texts) == 0:
            return EmbedResponse(embeddings=[])
        vecs = model.encode(request.texts).tolist()
        return EmbedResponse(embeddings=vecs)
    else:
        raise HTTPException(status_code=400, detail="Provide 'text' or 'texts'")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8090)
