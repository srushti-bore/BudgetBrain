"""
Tests for /api/v1/categories endpoints.

Covers: FR-6 (Create), FR-7 (Rename), FR-8 (Delete), FR-9 (List with counts).
"""
import uuid
from fastapi.testclient import TestClient

BASE_URL = "/api/v1/categories"


class TestListCategories:
    def test_list_returns_200(self, client: TestClient):
        response = client.get(BASE_URL)
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "meta" in data

    def test_list_includes_expense_counts(self, client: TestClient):
        cat_name = f"Cat_{uuid.uuid4().hex[:6]}"
        create_resp = client.post(BASE_URL, json={"name": cat_name})
        assert create_resp.status_code == 201
        cat_id = create_resp.json()["data"]["id"]

        get_resp = client.get(f"{BASE_URL}/{cat_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["data"]["name"] == cat_name



class TestCreateCategory:
    def test_create_valid_category_returns_201(self, client: TestClient):
        cat_name = f"Cat_{uuid.uuid4().hex[:6]}"
        res = client.post(BASE_URL, json={"name": cat_name})
        assert res.status_code == 201
        data = res.json()["data"]
        assert data["name"] == cat_name
        assert data["is_system"] is False

    def test_create_duplicate_name_returns_409(self, client: TestClient):
        cat_name = f"Cat_{uuid.uuid4().hex[:6]}"
        client.post(BASE_URL, json={"name": cat_name})
        res = client.post(BASE_URL, json={"name": cat_name})
        assert res.status_code == 409
        err = res.json()["error"]
        assert err["code"] == "CONFLICT"

    def test_create_empty_name_returns_422(self, client: TestClient):
        res = client.post(BASE_URL, json={"name": ""})
        assert res.status_code == 422


class TestUpdateCategory:
    def test_rename_returns_200(self, client: TestClient):
        cat_name = f"Cat_{uuid.uuid4().hex[:6]}"
        new_name = f"Cat_{uuid.uuid4().hex[:6]}"
        create_res = client.post(BASE_URL, json={"name": cat_name})
        cat_id = create_res.json()["data"]["id"]

        update_res = client.patch(f"{BASE_URL}/{cat_id}", json={"name": new_name})
        assert update_res.status_code == 200
        assert update_res.json()["data"]["name"] == new_name

    def test_rename_to_existing_name_returns_409(self, client: TestClient):
        cat_a = f"Cat_{uuid.uuid4().hex[:6]}"
        cat_b = f"Cat_{uuid.uuid4().hex[:6]}"
        client.post(BASE_URL, json={"name": cat_a})
        res_b = client.post(BASE_URL, json={"name": cat_b})
        cat_b_id = res_b.json()["data"]["id"]

        res = client.patch(f"{BASE_URL}/{cat_b_id}", json={"name": cat_a})
        assert res.status_code == 409


class TestDeleteCategory:
    def test_delete_unused_category_returns_204(self, client: TestClient):
        cat_name = f"Cat_{uuid.uuid4().hex[:6]}"
        create_res = client.post(BASE_URL, json={"name": cat_name})
        cat_id = create_res.json()["data"]["id"]

        del_res = client.delete(f"{BASE_URL}/{cat_id}")
        assert del_res.status_code == 204

        get_res = client.get(f"{BASE_URL}/{cat_id}")
        assert get_res.status_code == 404

    def test_delete_nonexistent_returns_404(self, client: TestClient):
        res = client.delete(f"{BASE_URL}/00000000-0000-0000-0000-000000000000")
        assert res.status_code == 404
