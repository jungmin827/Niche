from __future__ import annotations

import logging

from src.models.profile import ProfileRecord
from src.repositories.profile_repo import ProfileRepository

logger = logging.getLogger("niche.rank")

RANKS: list[tuple[int, str]] = [
    (0,    "eveil"),
    (15,   "seuil"),
    (40,   "fond"),
    (80,   "strate"),
    (150,  "distillat"),
    (250,  "trame"),
    (400,  "empreinte"),
    (600,  "corpus"),
    (850,  "paraphe"),
    (1200, "canon"),
]


def evaluate_rank(score: int) -> str:
    """Return the rank code for a given cumulative score."""
    for threshold, code in reversed(RANKS):
        if score >= threshold:
            return code
    return RANKS[0][1]


class RankService:
    def __init__(self, *, repo: ProfileRepository) -> None:
        self._repo = repo

    async def add_score(self, profile_id: str, points: int) -> ProfileRecord:
        """
        Add points to profile.rank_score.
        Recalculate rank.
        If rank changed, update profile.current_rank_code.
        Always update profile.rank_score.
        Return updated ProfileRecord.
        """
        profile = await self._repo.get_or_create(profile_id)
        old_rank = profile.current_rank_code
        new_score = profile.rank_score + points
        new_rank = evaluate_rank(new_score)

        updated = await self._repo.update(
            profile_id,
            rank_score=new_score,
            current_rank_code=new_rank,
        )

        if new_rank != old_rank:
            logger.info(
                "event=rank.up profile_id=%s old=%s new=%s score=%s",
                profile_id,
                old_rank,
                new_rank,
                new_score,
            )

        return updated
