"""
Tests for BudgetBrain RAG (Retrieval Augmented Generation) Service

Validates semantic embedding generation, document formatting, cosine similarity,
and vector search retrieval across user transactions.
"""

import pytest
from app.services.ai.embedding_service import EmbeddingService
from app.services.ai.rag_service import _cosine_similarity


def test_format_expense_document():
    doc = EmbeddingService.format_expense_document(
        title="Swiggy Biryani Dinner",
        amount=650.0,
        category_name="Food & Dining",
        date_val="2026-09-01",
        payment_mode="upi",
        mood="happy",
        notes="Dinner with family",
        currency_symbol="₹",
    )
    assert "Swiggy Biryani Dinner" in doc
    assert "₹650.00" in doc
    assert "Food & Dining" in doc
    assert "2026-09-01" in doc
    assert "upi" in doc
    assert "happy" in doc
    assert "Dinner with family" in doc


@pytest.mark.asyncio
async def test_embedding_generation_dimension():
    service = EmbeddingService()
    vec = await service.get_embedding("Swiggy Biryani Dinner with family ₹650")
    assert len(vec) == 768
    assert all(isinstance(x, float) for x in vec)


def test_cosine_similarity_identical():
    service = EmbeddingService()
    vec1 = service._generate_fallback_embedding("doctor consultation and medicine")
    sim = _cosine_similarity(vec1, vec1)
    assert pytest.approx(sim, 0.001) == 1.0


def test_cosine_similarity_semantic_overlap():
    service = EmbeddingService()
    vec_med1 = service._generate_fallback_embedding("hospital pharmacy and medical checkup")
    vec_med2 = service._generate_fallback_embedding("doctor clinic appointment and pharmacy tablets")
    vec_gadget = service._generate_fallback_embedding("wireless bluetooth headphones gadget")

    sim_related = _cosine_similarity(vec_med1, vec_med2)
    sim_unrelated = _cosine_similarity(vec_med1, vec_gadget)

    assert sim_related > sim_unrelated


def test_rag_sync_endpoint(client):
    response = client.post("/api/v1/ai/rag/sync")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "indexed" in data
    assert "total_pending" in data
    assert "message" in data


def test_rag_search_endpoint(client):
    response = client.get("/api/v1/ai/search?q=dinner")
    assert response.status_code == 200
    data = response.json()["data"]
    assert isinstance(data, list)


def test_rag_chat_endpoint_with_sources(client):
    response = client.post(
        "/api/v1/ai/chat",
        json={"messages": [{"role": "user", "content": "What did I spend on groceries or dinner?"}]},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "reply" in data
    assert "sources" in data
    assert isinstance(data["sources"], list)

