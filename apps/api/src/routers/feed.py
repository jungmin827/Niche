from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import Response

from src.dependencies.repositories import get_feed_post_repo, get_profile_repo
from src.repositories.feed_post_repo import FeedPostRepository
from src.repositories.profile_repo import ProfileRepository
from src.schemas.feed import (
    CreateFeedCommentRequest,
    CreateFeedPostRequest,
    FeedCommentDTO,
    FeedCommentListResponse,
    FeedPostListResponse,
)
from src.security import AuthenticatedUser, get_current_user
from src.services.feed_post_service import FeedPostService

router = APIRouter(prefix="/v1", tags=["feed"])


def get_feed_post_service(
    feed_post_repository: FeedPostRepository = Depends(get_feed_post_repo),
    profile_repository: ProfileRepository = Depends(get_profile_repo),
) -> FeedPostService:
    return FeedPostService(
        feed_post_repository=feed_post_repository,
        profile_repository=profile_repository,
    )


@router.get("/feed-posts", response_model=FeedPostListResponse)
async def list_feed_posts(
    limit: int = Query(default=30, ge=1, le=100),
    service: FeedPostService = Depends(get_feed_post_service),
) -> FeedPostListResponse:
    items = await service.list_active_posts(limit=limit)
    return FeedPostListResponse(items=items)


@router.post("/feed-posts", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_feed_post(
    payload: CreateFeedPostRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: FeedPostService = Depends(get_feed_post_service),
) -> dict:
    post_dto = await service.create_post(
        author_id=current_user.profile_id,
        content=payload.content,
    )
    return {"post": post_dto.model_dump(by_alias=True)}


@router.delete("/feed-posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feed_post(
    post_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: FeedPostService = Depends(get_feed_post_service),
) -> Response:
    await service.delete_post(post_id=post_id, author_id=current_user.profile_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/feed-posts/{post_id}/comments", response_model=FeedCommentListResponse)
async def list_feed_post_comments(
    post_id: str,
    service: FeedPostService = Depends(get_feed_post_service),
) -> FeedCommentListResponse:
    items = await service.list_comments(post_id=post_id)
    return FeedCommentListResponse(items=items)


@router.post(
    "/feed-posts/{post_id}/comments",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
)
async def create_feed_post_comment(
    post_id: str,
    payload: CreateFeedCommentRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: FeedPostService = Depends(get_feed_post_service),
) -> dict:
    comment_dto: FeedCommentDTO = await service.add_comment(
        post_id=post_id,
        author_id=current_user.profile_id,
        content=payload.content,
    )
    return {"comment": comment_dto.model_dump(by_alias=True)}


@router.delete(
    "/feed-posts/{post_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_feed_post_comment(
    post_id: str,
    comment_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: FeedPostService = Depends(get_feed_post_service),
) -> Response:
    await service.delete_comment(
        comment_id=comment_id,
        author_id=current_user.profile_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
