import asyncio
import unittest

import httpx

from src.main import app


class HighlightDetailIntegrationTest(unittest.TestCase):
    def test_highlight_detail_includes_source_linkage_fields(self) -> None:
        asyncio.run(self._run_scenario())

    async def _run_scenario(self) -> None:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            headers = {"Authorization": "Bearer highlight-contract-user"}

            created_session = await client.post(
                "/v1/sessions",
                json={"topic": "Contract source", "plannedMinutes": 15},
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

            created_highlight = await client.post(
                "/v1/highlights",
                json={
                    "sourceType": "session",
                    "sessionId": session_id,
                    "bundleId": None,
                    "title": "Linked highlight",
                    "caption": "Saved from preview",
                    "templateCode": "mono_story_v1",
                    "renderedImagePath": "content/user/highlight/rendered/final.jpg",
                    "sourcePhotoPath": None,
                    "visibility": "public",
                },
                headers=headers,
            )
            self.assertEqual(created_highlight.status_code, 201)
            highlight_id = created_highlight.json()["highlight"]["id"]

            fetched_highlight = await client.get(
                f"/v1/highlights/{highlight_id}",
                headers=headers,
            )
            self.assertEqual(fetched_highlight.status_code, 200)

            highlight = fetched_highlight.json()["highlight"]
            self.assertIn("sessionId", highlight)
            self.assertIn("bundleId", highlight)
            self.assertEqual(highlight["sessionId"], session_id)
            self.assertIsNone(highlight["bundleId"])


if __name__ == "__main__":
    unittest.main()
