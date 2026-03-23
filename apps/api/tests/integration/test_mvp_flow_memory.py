import asyncio
import unittest

import httpx

from src.main import app


class MemoryMvpFlowIntegrationTest(unittest.TestCase):
    def test_session_note_highlight_archive_flow_on_memory_backend(self) -> None:
        asyncio.run(self._run_scenario())

    def test_cors_preflight_allows_local_web_origin(self) -> None:
        asyncio.run(self._run_cors_preflight_scenario())

    def test_malformed_highlight_request_returns_422_error_shape(self) -> None:
        asyncio.run(self._run_malformed_highlight_scenario())

    def test_bundle_only_highlight_returns_explicit_linkage_fields(self) -> None:
        asyncio.run(self._run_bundle_highlight_scenario())

    async def _run_scenario(self) -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            headers = {"Authorization": "Bearer memory-flow-user"}

            created_session = await client.post(
                "/v1/sessions",
                json={"topic": "Memory flow", "plannedMinutes": 15},
                headers=headers,
            )
            self.assertEqual(created_session.status_code, 201)
            session_id = created_session.json()["session"]["id"]

            completed_session = await client.post(
                f"/v1/sessions/{session_id}/complete",
                json={},
                headers=headers,
            )
            self.assertEqual(completed_session.status_code, 200)

            saved_note = await client.put(
                f"/v1/sessions/{session_id}/note",
                json={
                    "summary": "Focused on one page.",
                    "insight": "The rhythm stayed.",
                    "mood": "calm",
                    "tags": ["rhythm"],
                },
                headers=headers,
            )
            self.assertEqual(saved_note.status_code, 200)

            updated_note = await client.put(
                f"/v1/sessions/{session_id}/note",
                json={
                    "summary": "Focused on one page twice.",
                    "insight": "The rhythm stayed longer.",
                    "mood": "calm",
                    "tags": ["rhythm", "revision"],
                },
                headers=headers,
            )
            self.assertEqual(updated_note.status_code, 200)

            fetched_note = await client.get(
                f"/v1/sessions/{session_id}/note", headers=headers
            )
            self.assertEqual(fetched_note.status_code, 200)
            self.assertEqual(fetched_note.json()["note"]["sessionId"], session_id)
            self.assertEqual(
                fetched_note.json()["note"]["summary"], "Focused on one page twice."
            )

            created_highlight = await client.post(
                "/v1/highlights",
                json={
                    "sourceType": "session",
                    "sessionId": session_id,
                    "bundleId": None,
                    "title": "Saved highlight",
                    "caption": "One quiet passage stayed.",
                    "templateCode": "mono_story_v1",
                    "renderedImagePath": "content/user/highlight/rendered/final.jpg",
                    "sourcePhotoPath": None,
                    "visibility": "public",
                },
                headers=headers,
            )
            self.assertEqual(created_highlight.status_code, 201)
            highlight_id = created_highlight.json()["highlight"]["id"]

            archive = await client.get("/v1/me/archive", headers=headers)
            self.assertEqual(archive.status_code, 200)
            self.assertEqual(
                archive.json()["highlights"]["items"][0]["id"], highlight_id
            )

            detail = await client.get(f"/v1/highlights/{highlight_id}", headers=headers)
            self.assertEqual(detail.status_code, 200)
            highlight = detail.json()["highlight"]
            self.assertEqual(highlight["sessionId"], session_id)
            self.assertIn("bundleId", highlight)
            self.assertIsNone(highlight["bundleId"])

            source_session = await client.get(
                f"/v1/sessions/{session_id}", headers=headers
            )
            self.assertEqual(source_session.status_code, 200)
            source_payload = source_session.json()
            self.assertEqual(source_payload["session"]["id"], session_id)
            self.assertEqual(
                source_payload["note"]["summary"], "Focused on one page twice."
            )

    async def _run_malformed_highlight_scenario(self) -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            headers = {"Authorization": "Bearer malformed-highlight-user"}

            response = await client.post(
                "/v1/highlights",
                json={
                    "sourceType": "session",
                    "title": "Invalid highlight",
                    "renderedImagePath": "content/user/highlight/rendered/invalid.jpg",
                },
                headers=headers,
            )

            self.assertEqual(response.status_code, 422)
            body = response.json()
            self.assertEqual(body["error"]["code"], "VALIDATION_ERROR")
            self.assertEqual(body["error"]["message"], "Request validation failed.")
            self.assertIsInstance(body["error"]["details"]["errors"], list)
            self.assertIn(
                "sourceType=session requires sessionId",
                body["error"]["details"]["errors"][0]["msg"],
            )

    async def _run_cors_preflight_scenario(self) -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            response = await client.options(
                "/v1/me/sessions",
                headers={
                    "Origin": "http://localhost:8081",
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "authorization",
                },
            )

            self.assertEqual(response.status_code, 200)
            self.assertEqual(
                response.headers["access-control-allow-origin"], "http://localhost:8081"
            )
            self.assertIn("GET", response.headers["access-control-allow-methods"])
            self.assertIn(
                "Authorization", response.headers["access-control-allow-headers"]
            )

    async def _run_bundle_highlight_scenario(self) -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            headers = {"Authorization": "Bearer bundle-highlight-user"}
            bundle_id = "11111111-1111-1111-1111-111111111111"

            created_highlight = await client.post(
                "/v1/highlights",
                json={
                    "sourceType": "sessionBundle",
                    "sessionId": None,
                    "bundleId": bundle_id,
                    "title": "Bundle highlight",
                    "caption": "Saved from a bundle.",
                    "templateCode": "mono_story_v1",
                    "renderedImagePath": "content/user/highlight/rendered/bundle.jpg",
                    "sourcePhotoPath": None,
                    "visibility": "private",
                },
                headers=headers,
            )
            self.assertEqual(created_highlight.status_code, 201)
            created_payload = created_highlight.json()["highlight"]
            self.assertIsNone(created_payload["sessionId"])
            self.assertEqual(created_payload["bundleId"], bundle_id)

            highlight_id = created_payload["id"]
            detail = await client.get(f"/v1/highlights/{highlight_id}", headers=headers)
            self.assertEqual(detail.status_code, 200)
            detail_payload = detail.json()["highlight"]
            self.assertEqual(detail_payload["sourceType"], "sessionBundle")
            self.assertIsNone(detail_payload["sessionId"])
            self.assertEqual(detail_payload["bundleId"], bundle_id)


if __name__ == "__main__":
    unittest.main()
