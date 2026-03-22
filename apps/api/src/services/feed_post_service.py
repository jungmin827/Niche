from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from src.exceptions import NotFoundError, ValidationAppError
from src import error_codes
from src.models.feed_post import FeedPostCommentRecord, FeedPostRecord
from src.repositories.feed_post_repo import FeedPostRepository
from src.repositories.profile_repo import ProfileRepository
from src.schemas.feed import FeedAuthorDTO, FeedCommentDTO, FeedPostDTO

logger = logging.getLogger("niche.feed_post")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class FeedPostService:
    def __init__(
        self,
        *,
        feed_post_repository: FeedPostRepository,
        profile_repository: ProfileRepository,
    ) -> None:
        self._feed_post_repository = feed_post_repository
        self._profile_repository = profile_repository

    async def create_post(self, *, author_id: str, content: str) -> FeedPostDTO:
        if len(content) > 50:
            raise ValidationAppError(
                "Post content must be 50 characters or fewer.",
                details={"maxLength": 50, "actualLength": len(content)},
            )
        now = _utc_now()
        record = FeedPostRecord(
            author_id=author_id,
            content=content,
            expires_at=now + timedelta(hours=24),
            created_at=now,
        )
        saved = await self._feed_post_repository.create_post(record)
        author = await self._resolve_author(author_id)
        return FeedPostDTO(
            id=saved.id,
            author=author,
            content=saved.content,
            created_at=saved.created_at,
            expires_at=saved.expires_at,
            comment_count=0,
        )

    async def list_active_posts(self, *, limit: int) -> list[FeedPostDTO]:
        posts = await self._feed_post_repository.list_active_posts(limit)
        result: list[FeedPostDTO] = []
        for post in posts:
            author = await self._resolve_author(post.author_id)
            comments = await self._feed_post_repository.list_comments(post.id)
            result.append(
                FeedPostDTO(
                    id=post.id,
                    author=author,
                    content=post.content,
                    created_at=post.created_at,
                    expires_at=post.expires_at,
                    comment_count=len(comments),
                )
            )
        return result

    async def delete_post(self, *, post_id: str, author_id: str) -> bool:
        post = await self._feed_post_repository.get_post(post_id)
        if post is None:
            return False
        if post.author_id != author_id:
            return False
        return await self._feed_post_repository.delete_post(post_id)

    async def add_comment(
        self, *, post_id: str, author_id: str, content: str
    ) -> FeedCommentDTO:
        post = await self._feed_post_repository.get_post(post_id)
        if post is None:
            raise NotFoundError(
                code=error_codes.NOT_FOUND,
                message="Feed post not found.",
            )
        if post.expires_at <= _utc_now():
            raise ValidationAppError(
                "This post has expired.",
                details={"postId": post_id},
            )
        if len(content) > 20:
            raise ValidationAppError(
                "Comment content must be 20 characters or fewer.",
                details={"maxLength": 20, "actualLength": len(content)},
            )
        record = FeedPostCommentRecord(
            post_id=post_id,
            author_id=author_id,
            content=content,
        )
        saved = await self._feed_post_repository.create_comment(record)
        author = await self._resolve_author(author_id)
        return FeedCommentDTO(
            id=saved.id,
            author=author,
            content=saved.content,
            created_at=saved.created_at,
        )

    async def list_comments(self, *, post_id: str) -> list[FeedCommentDTO]:
        comments = await self._feed_post_repository.list_comments(post_id)
        result: list[FeedCommentDTO] = []
        for comment in comments:
            author = await self._resolve_author(comment.author_id)
            result.append(
                FeedCommentDTO(
                    id=comment.id,
                    author=author,
                    content=comment.content,
                    created_at=comment.created_at,
                )
            )
        return result

    async def delete_comment(self, *, comment_id: str, author_id: str) -> bool:
        comment = await self._feed_post_repository.get_comment(comment_id)
        if comment is None:
            return False
        if comment.author_id != author_id:
            return False
        return await self._feed_post_repository.delete_comment(comment_id)

    async def cleanup_expired_posts(self) -> int:
        count = await self._feed_post_repository.delete_expired_posts()
        logger.info("event=feed.cleanup expired_deleted=%s", count)
        return count

    async def _resolve_author(self, profile_id: str) -> FeedAuthorDTO:
        record = await self._profile_repository.get_or_create(profile_id)
        return FeedAuthorDTO(
            id=record.id,
            handle=record.handle,
            display_name=record.display_name or record.handle,
        )
