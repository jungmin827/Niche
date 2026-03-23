from __future__ import annotations

from fastapi import APIRouter, Depends, status
from fastapi.responses import Response

from src import error_codes
from src.config import Settings, get_settings
from src.dependencies.repositories import get_blog_post_repo
from src.exceptions import NotFoundError
from src.models.blog_post import BlogPostRecord
from src.repositories.blog_post_repo import BlogPostRepository
from src.schemas.blog_post import (
    BlogPostEnvelope,
    BlogPostListItemResponse,
    BlogPostListResponse,
    BlogPostResponse,
    CreateBlogPostRequest,
    UpdateBlogPostRequest,
)
from src.security import AuthenticatedUser, get_current_user
from src.services.blog_post_service import BlogPostService

router = APIRouter(prefix="/v1", tags=["blog-posts"])


def get_blog_post_service(
    repo: BlogPostRepository = Depends(get_blog_post_repo),
    settings: Settings = Depends(get_settings),
) -> BlogPostService:
    return BlogPostService(repo=repo, settings=settings)


def _to_response(record: BlogPostRecord, service: BlogPostService) -> BlogPostResponse:
    return BlogPostResponse(
        id=record.id,
        title=record.title,
        excerpt=record.excerpt,
        body_md=record.body_md,
        cover_image_url=service._resolve_cover_url(record.cover_image_path),
        visibility=record.visibility,
        published_at=record.published_at,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.get("/blog-posts", response_model=BlogPostListResponse)
async def list_public_blog_posts(
    service: BlogPostService = Depends(get_blog_post_service),
) -> BlogPostListResponse:
    records = await service.list_all_public()
    items = [
        BlogPostListItemResponse(
            id=r.id,
            author_id=r.author_id,
            title=r.title,
            excerpt=r.excerpt,
            cover_image_url=service._resolve_cover_url(r.cover_image_path),
            visibility=r.visibility,
            published_at=r.published_at,
        )
        for r in records
    ]
    return BlogPostListResponse(items=items, next_cursor=None, has_next=False)


@router.post(
    "/blog-posts", response_model=BlogPostEnvelope, status_code=status.HTTP_201_CREATED
)
async def create_blog_post(
    payload: CreateBlogPostRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: BlogPostService = Depends(get_blog_post_service),
) -> BlogPostEnvelope:
    record = await service.create(
        author_id=current_user.profile_id,
        title=payload.title,
        body_md=payload.body_md,
        excerpt=payload.excerpt,
        cover_image_path=payload.cover_image_path,
        visibility=payload.visibility,
    )
    return BlogPostEnvelope(post=_to_response(record, service))


@router.get("/blog-posts/{post_id}", response_model=BlogPostEnvelope)
async def get_blog_post(
    post_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: BlogPostService = Depends(get_blog_post_service),
) -> BlogPostEnvelope:
    record = await service.get_by_id(post_id)
    if record is None:
        raise NotFoundError(code=error_codes.NOT_FOUND, message="Blog post not found.")
    if record.visibility == "private" and record.author_id != current_user.profile_id:
        raise NotFoundError(code=error_codes.NOT_FOUND, message="Blog post not found.")
    return BlogPostEnvelope(post=_to_response(record, service))


@router.patch("/blog-posts/{post_id}", response_model=BlogPostEnvelope)
async def update_blog_post(
    post_id: str,
    payload: UpdateBlogPostRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: BlogPostService = Depends(get_blog_post_service),
) -> BlogPostEnvelope:
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    record = await service.update(
        post_id=post_id,
        author_id=current_user.profile_id,
        **updates,
    )
    if record is None:
        raise NotFoundError(code=error_codes.NOT_FOUND, message="Blog post not found.")
    return BlogPostEnvelope(post=_to_response(record, service))


@router.delete("/blog-posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blog_post(
    post_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: BlogPostService = Depends(get_blog_post_service),
) -> Response:
    deleted = await service.delete(post_id=post_id, author_id=current_user.profile_id)
    if not deleted:
        raise NotFoundError(code=error_codes.NOT_FOUND, message="Blog post not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me/blog-posts", response_model=BlogPostListResponse)
async def list_my_blog_posts(
    current_user: AuthenticatedUser = Depends(get_current_user),
    service: BlogPostService = Depends(get_blog_post_service),
) -> BlogPostListResponse:
    records = await service.list_by_author(current_user.profile_id)
    records.sort(key=lambda r: r.published_at, reverse=True)
    items = [
        BlogPostListItemResponse(
            id=r.id,
            author_id=r.author_id,
            title=r.title,
            excerpt=r.excerpt,
            cover_image_url=service._resolve_cover_url(r.cover_image_path),
            visibility=r.visibility,
            published_at=r.published_at,
        )
        for r in records
    ]
    return BlogPostListResponse(items=items, next_cursor=None, has_next=False)
