from urllib.parse import quote

from fastapi.testclient import TestClient
import pytest

from src.app import app, activities


client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "test.user@example.com"

    # ensure clean start
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # signup should succeed
    path = f"/activities/{quote(activity)}/signup?email={quote(email)}"
    resp = client.post(path)
    assert resp.status_code == 200
    data = resp.json()
    assert "participants" in data
    assert email in data["participants"]

    # signing up again returns 400 (already signed up)
    resp = client.post(path)
    assert resp.status_code == 400

    # unregister should succeed
    resp = client.delete(path)
    assert resp.status_code == 200
    data = resp.json()
    assert email not in data["participants"]
