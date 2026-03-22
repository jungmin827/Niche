import asyncio
import os
import unittest

import httpx

from src.config import get_settings
from src.dependencies.repositories import reset_repository_backends
from src.main import app


@unittest.skipUnless(os.getenv("NICHE_DATABASE_URL"), "NICHE_DATABASE_URL is required for Postgres integration.")
class PostgresMvpFlowIntegrationTest(unittest.TestCase):
    def test_session_note_highlight_archive_flow_on_postgres_backend(self) -> None:
        asyncio.run(self._run_scenario())

    async def _run_scenario(self) -> None:
        previous_backend = os.environ.get("NICHE_SESSION_REPOSITORY_BACKEND")
        os.environ["NICHE_SESSION_REPOSITORY_BACKEND"] = "postgres"
        get_settings.cache_clear()
        reset_repository_backends()
        settings = get_settings()

        from src.db import get_async_engine
        from src.models.base import Base

        engine = get_async_engine(settings)
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
            await connection.run_sync(Base.metadata.create_all)

        try:
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
                headers = {"Authorization": "Bearer postgres-flow-user"}

                created_session = await client.post(
                    "/v1/sessions",
                    json={"topic": "Postgres flow", "plannedMinutes": 15},
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
                    json={"summary": "Persisted note", "tags": ["persistence"]},
                    headers=headers,
                )
                self.assertEqual(saved_note.status_code, 200)

                updated_note = await client.put(
                    f"/v1/sessions/{session_id}/note",
                    json={"summary": "Persisted note updated", "tags": ["persistence", "update"]},
                    headers=headers,
                )
                self.assertEqual(updated_note.status_code, 200)

                fetched_note = await client.get(f"/v1/sessions/{session_id}/note", headers=headers)
                self.assertEqual(fetched_note.status_code, 200)
                self.assertEqual(fetched_note.json()["note"]["sessionId"], session_id)
                self.assertEqual(fetched_note.json()["note"]["summary"], "Persisted note updated")

                created_highlight = await client.post(
                    "/v1/highlights",
                    json={
                        "sourceType": "session",
                        "sessionId": session_id,
                        "bundleId": None,
                        "title": "Persisted highlight",
                        "caption": "Saved through Postgres.",
                        "templateCode": "mono_story_v1",
                        "renderedImagePath": "content/user/highlight/rendered/persisted.jpg",
                        "sourcePhotoPath": None,
                        "visibility": "public",
                    },
                    headers=headers,
                )
                self.assertEqual(created_highlight.status_code, 201)
                highlight_id = created_highlight.json()["highlight"]["id"]

                archive = await client.get("/v1/me/archive", headers=headers)
                self.assertEqual(archive.status_code, 200)
                self.assertEqual(archive.json()["highlights"]["items"][0]["id"], highlight_id)

                detail = await client.get(f"/v1/highlights/{highlight_id}", headers=headers)
                self.assertEqual(detail.status_code, 200)
                self.assertEqual(detail.json()["highlight"]["sessionId"], session_id)

                source_session = await client.get(f"/v1/sessions/{session_id}", headers=headers)
                self.assertEqual(source_session.status_code, 200)
                self.assertEqual(source_session.json()["note"]["summary"], "Persisted note updated")
        finally:
            if previous_backend is None:
                os.environ.pop("NICHE_SESSION_REPOSITORY_BACKEND", None)
            else:
                os.environ["NICHE_SESSION_REPOSITORY_BACKEND"] = previous_backend
            get_settings.cache_clear()
            reset_repository_backends()


if __name__ == "__main__":
    unittest.main()
