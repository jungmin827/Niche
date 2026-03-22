from __future__ import annotations

from datetime import datetime, timezone
from typing import Protocol

from src.models.feed_post import FeedPostCommentRecord, FeedPostRecord


class FeedPostRepository(Protocol):
    async def create_post(self, record: FeedPostRecord) -> FeedPostRecord: ...

    async def list_active_posts(self, limit: int) -> list[FeedPostRecord]: ...

    async def get_post(self, post_id: str) -> FeedPostRecord | None: ...

    async def delete_post(self, post_id: str) -> bool: ...

    async def delete_expired_posts(self) -> int: ...

    async def create_comment(self, record: FeedPostCommentRecord) -> FeedPostCommentRecord: ...

    async def list_comments(self, post_id: str) -> list[FeedPostCommentRecord]: ...

    async def get_comment(self, comment_id: str) -> FeedPostCommentRecord | None: ...

    async def delete_comment(self, comment_id: str) -> bool: ...


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class InMemoryFeedPostRepository:
    def __init__(self) -> None:
        self._posts: dict[str, FeedPostRecord] = {}
        self._comments: dict[str, FeedPostCommentRecord] = {}

    async def create_post(self, record: FeedPostRecord) -> FeedPostRecord:
        self._posts[record.id] = record
        return record

    async def list_active_posts(self, limit: int) -> list[FeedPostRecord]:
        now = _utc_now()
        active = [
            p for p in self._posts.values()
            if _as_utc(p.expires_at) > now
        ]
        active.sort(key=lambda p: p.created_at, reverse=True)
        return active[:limit]

    async def get_post(self, post_id: str) -> FeedPostRecord | None:
        return self._posts.get(post_id)

    async def delete_post(self, post_id: str) -> bool:
        if post_id in self._posts:
            del self._posts[post_id]
            # cascade: delete associated comments
            self._comments = {
                cid: c for cid, c in self._comments.items() if c.post_id != post_id
            }
            return True
        return False

    async def delete_expired_posts(self) -> int:
        now = _utc_now()
        expired_ids = [
            pid for pid, p in self._posts.items()
            if _as_utc(p.expires_at) <= now
        ]
        for pid in expired_ids:
            del self._posts[pid]
        self._comments = {
            cid: c for cid, c in self._comments.items() if c.post_id not in expired_ids
        }
        return len(expired_ids)

    async def create_comment(self, record: FeedPostCommentRecord) -> FeedPostCommentRecord:
        self._comments[record.id] = record
        return record

    async def list_comments(self, post_id: str) -> list[FeedPostCommentRecord]:
        comments = [c for c in self._comments.values() if c.post_id == post_id]
        comments.sort(key=lambda c: c.created_at)
        return comments

    async def get_comment(self, comment_id: str) -> FeedPostCommentRecord | None:
        return self._comments.get(comment_id)

    async def delete_comment(self, comment_id: str) -> bool:
        if comment_id in self._comments:
            del self._comments[comment_id]
            return True
        return False
