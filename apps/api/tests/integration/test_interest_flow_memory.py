import asyncio
import unittest
from datetime import date, timedelta

import httpx

from src.main import app

HEADERS = {"Authorization": "Bearer memory-flow-user"}


class InterestFlowMemoryTest(unittest.TestCase):
    def test_create_interest_and_log_depth_score_flow(self) -> None:
        asyncio.run(self._run_main_flow())

    def test_depth_score_is_null_with_no_logs(self) -> None:
        asyncio.run(self._run_null_depth_score())

    def test_cascade_soft_delete(self) -> None:
        asyncio.run(self._run_cascade_delete())

    def test_future_started_at_returns_422(self) -> None:
        asyncio.run(self._run_future_date_validation())

    def test_invalid_log_text_returns_422(self) -> None:
        asyncio.run(self._run_invalid_text_validation())

    def test_unauthorized_access_returns_404(self) -> None:
        asyncio.run(self._run_unauthorized_access())

    def test_response_keys_are_camel_case(self) -> None:
        asyncio.run(self._run_camel_case_check())

    # ------------------------------------------------------------------ #

    async def _run_main_flow(self) -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            # Create interest
            res = await client.post(
                "/v1/interests",
                json={"name": "자연 와인", "startedAt": str(date.today() - timedelta(days=100))},
                headers=HEADERS,
            )
            self.assertEqual(res.status_code, 201, res.text)
            interest = res.json()
            interest_id = interest["id"]
            self.assertIsNone(interest["depthScore"], "depthScore must be null with 0 logs")

            # Add first log
            res = await client.post(
                f"/v1/interests/{interest_id}/logs",
                json={"text": "첫 번째 테이스팅 노트", "tag": "tasting_note"},
                headers=HEADERS,
            )
            self.assertEqual(res.status_code, 201, res.text)
            body = res.json()
            self.assertIsNotNone(body["interest"]["depthScore"])
            self.assertGreater(body["interest"]["depthScore"], 0)

            # Add second log
            res = await client.post(
                f"/v1/interests/{interest_id}/logs",
                json={"text": "두 번째 관찰 기록", "tag": "observation"},
                headers=HEADERS,
            )
            self.assertEqual(res.status_code, 201, res.text)
            score_after_2 = res.json()["interest"]["depthScore"]
            self.assertGreater(score_after_2, 0)

            # GET /me/interests — check depthScore present
            res = await client.get("/v1/me/interests", headers=HEADERS)
            self.assertEqual(res.status_code, 200, res.text)
            items = res.json()["items"]
            self.assertTrue(any(i["id"] == interest_id for i in items))

    async def _run_null_depth_score(self) -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            res = await client.post(
                "/v1/interests",
                json={"name": "독립 영화", "startedAt": str(date.today() - timedelta(days=30))},
                headers=HEADERS,
            )
            self.assertEqual(res.status_code, 201, res.text)
            self.assertIsNone(res.json()["depthScore"])

    async def _run_cascade_delete(self) -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            # Create interest + log
            res = await client.post(
                "/v1/interests",
                json={"name": "삭제 테스트", "startedAt": str(date.today() - timedelta(days=10))},
                headers=HEADERS,
            )
            self.assertEqual(res.status_code, 201)
            interest_id = res.json()["id"]

            await client.post(
                f"/v1/interests/{interest_id}/logs",
                json={"text": "삭제될 기록", "tag": "reading"},
                headers=HEADERS,
            )

            # Delete interest
            res = await client.delete(f"/v1/interests/{interest_id}", headers=HEADERS)
            self.assertEqual(res.status_code, 204)

            # Verify interest is gone
            res = await client.get(f"/v1/interests/{interest_id}", headers=HEADERS)
            self.assertEqual(res.status_code, 404)

    async def _run_future_date_validation(self) -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            res = await client.post(
                "/v1/interests",
                json={"name": "미래 관심사", "startedAt": str(date.today() + timedelta(days=1))},
                headers=HEADERS,
            )
            self.assertEqual(res.status_code, 422, res.text)

    async def _run_invalid_text_validation(self) -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            # Create interest first
            res = await client.post(
                "/v1/interests",
                json={"name": "텍스트 검증", "startedAt": str(date.today() - timedelta(days=5))},
                headers=HEADERS,
            )
            self.assertEqual(res.status_code, 201)
            interest_id = res.json()["id"]

            # Empty text
            res = await client.post(
                f"/v1/interests/{interest_id}/logs",
                json={"text": "", "tag": "reading"},
                headers=HEADERS,
            )
            self.assertEqual(res.status_code, 422, "empty text should return 422")

            # Whitespace only
            res = await client.post(
                f"/v1/interests/{interest_id}/logs",
                json={"text": "   ", "tag": "reading"},
                headers=HEADERS,
            )
            self.assertEqual(res.status_code, 422, "whitespace-only text should return 422")

            # Over 2000 chars
            res = await client.post(
                f"/v1/interests/{interest_id}/logs",
                json={"text": "x" * 2001, "tag": "reading"},
                headers=HEADERS,
            )
            self.assertEqual(res.status_code, 422, "2001-char text should return 422")

    async def _run_unauthorized_access(self) -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            other_headers = {"Authorization": "Bearer other-user"}

            # Create interest as user A
            res = await client.post(
                "/v1/interests",
                json={"name": "내 관심사", "startedAt": str(date.today() - timedelta(days=50))},
                headers=HEADERS,
            )
            self.assertEqual(res.status_code, 201)
            interest_id = res.json()["id"]

            # Try to add log as user B
            res = await client.post(
                f"/v1/interests/{interest_id}/logs",
                json={"text": "타인의 기록", "tag": "visit"},
                headers=other_headers,
            )
            self.assertEqual(res.status_code, 404, "other user should get 404")

            # Try to delete as user B
            res = await client.delete(f"/v1/interests/{interest_id}", headers=other_headers)
            self.assertEqual(res.status_code, 404, "other user delete should get 404")

    async def _run_camel_case_check(self) -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            res = await client.post(
                "/v1/interests",
                json={"name": "camelCase 검증", "startedAt": str(date.today() - timedelta(days=1))},
                headers=HEADERS,
            )
            self.assertEqual(res.status_code, 201, res.text)
            interest = res.json()
            interest_id = interest["id"]

            # Interest response keys
            for key in ("startedAt", "depthScore", "isPublic", "recordCount", "createdAt"):
                self.assertIn(key, interest, f"missing camelCase key: {key}")

            # Log response keys
            res = await client.post(
                f"/v1/interests/{interest_id}/logs",
                json={"text": "키 검증 기록", "tag": "observation"},
                headers=HEADERS,
            )
            self.assertEqual(res.status_code, 201, res.text)
            log = res.json()["log"]
            for key in ("interestId", "loggedAt", "isPublic", "createdAt"):
                self.assertIn(key, log, f"missing camelCase key in log: {key}")
