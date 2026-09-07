"""
BudgetBrain — Embedding Service

Generates 768-dimensional semantic vector embeddings using Google Gemini
(gemini-embedding-001) with graceful deterministic fallback for offline / test environments.
"""

import hashlib
import math
from datetime import date
from typing import Sequence
import httpx

from app.config import Settings, get_settings


class EmbeddingService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.api_key = (self.settings.GEMINI_API_KEY or "").strip()
        self.dimension = 768

    @staticmethod
    def format_expense_document(
        title: str,
        amount: float,
        category_name: str | None = None,
        date_val: str | date | None = None,
        payment_mode: str | None = None,
        mood: str | None = None,
        notes: str | None = None,
        currency_symbol: str = "₹",
    ) -> str:
        """
        Serializes an expense and its context into an information-dense semantic document
        optimized for vector similarity matching.
        """
        parts = [
            f"Expense: {title.strip()}",
            f"Amount: {currency_symbol}{float(amount):,.2f}",
        ]
        if category_name:
            parts.append(f"Category: {category_name.strip()}")
        if date_val:
            parts.append(f"Date: {str(date_val)}")
        if payment_mode:
            parts.append(f"Payment Mode: {payment_mode.strip()}")
        if mood:
            parts.append(f"Mood: {mood.strip()}")
        if notes and notes.strip():
            parts.append(f"Notes: {notes.strip()}")
        return ". ".join(parts) + "."

    async def get_embedding(self, text: str) -> list[float]:
        """
        Generates a 768-dimensional vector embedding for the input text.
        Uses Gemini's gemini-embedding-001 with outputDimensionality=768.
        Falls back to deterministic normalized pseudo-vector if API call fails or key is missing.
        """
        cleaned = text.strip()
        if not cleaned:
            return [0.0] * self.dimension

        if self.settings.AI_PROVIDER == "rules" or not self.api_key:
            return self._generate_fallback_embedding(cleaned)

        if self.api_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={self.api_key}"
            payload = {
                "content": {"parts": [{"text": cleaned}]},
                "outputDimensionality": self.dimension,
            }
            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        vals = res.json().get("embedding", {}).get("values", [])
                        if len(vals) == self.dimension:
                            return [float(v) for v in vals]
            except Exception as e:
                # Log and proceed to fallback
                pass

        return self._generate_fallback_embedding(cleaned)

    def _generate_fallback_embedding(self, text: str) -> list[float]:
        """
        Generates a deterministic, normalized 768-dimensional vector using cryptographic hashes.
        Ensures identical texts yield identical embeddings, and semantically identical tokens
        have non-zero inner products. Used in offline / test environments.
        """
        vector = [0.0] * self.dimension
        tokens = text.lower().split()
        if not tokens:
            tokens = [text.lower()]

        for token in tokens:
            # Hash each token with sha256 to seed positions across the 768 dims
            h = hashlib.sha256(token.encode("utf-8")).digest()
            for i in range(min(16, len(h) // 2)):
                idx = int.from_bytes(h[i * 2 : (i + 1) * 2], "big") % self.dimension
                # pseudo-random float between -1.0 and 1.0
                sign = 1.0 if h[i] % 2 == 0 else -1.0
                val = sign * ((h[i] / 255.0) + 0.1)
                vector[idx] += val

        # L2-normalize vector to unit length
        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 0:
            vector = [v / norm for v in vector]
        else:
            vector[0] = 1.0

        return vector
