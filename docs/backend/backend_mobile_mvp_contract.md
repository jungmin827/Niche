# NichE Mobile MVP Backend Contract

This document is the locked backend contract for the current mobile MVP slice in `apps/api`.
It covers the working loop:

- session start
- session complete / cancel
- session note save / read
- highlight create / read / update / list
- archive list
- source session hydration from highlight detail

All authenticated requests require `Authorization: Bearer <token>`.
All request and response DTOs use camelCase.

## Error Envelope

All application errors use:

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message.",
    "details": {}
  }
}
```

Current status/code expectations for the MVP slice:

- `401 UNAUTHORIZED`: missing or invalid bearer auth
- `403 FORBIDDEN`: authenticated user does not own a private resource
- `404`: session / note / highlight not found
- `409`: state conflict such as active-session collision or duplicate highlight per source
- `422 VALIDATION_ERROR`: malformed body, malformed cursor, or invalid request shape
- `503 INTERNAL_ERROR`: Postgres backend selected but unavailable
- `500 INTERNAL_ERROR`: unexpected unhandled server failure only

Validation errors return `code = "VALIDATION_ERROR"` and `details.errors` as a JSON-safe list of validation issues.

## Session Endpoints

### `POST /v1/sessions`

Request:

```json
{
  "topic": "Murakami sentence rhythm",
  "subject": "Japanese literature",
  "plannedMinutes": 15,
  "source": "book"
}
```

Notes:

- `topic`: optional, nullable
- `subject`: optional, nullable
- `plannedMinutes`: optional, defaults to backend default when omitted
- `source`: optional, nullable

Response `201`:

```json
{
  "session": {
    "id": "uuid",
    "topic": "Murakami sentence rhythm",
    "subject": "Japanese literature",
    "plannedMinutes": 15,
    "actualMinutes": null,
    "status": "active",
    "startedAt": "2026-03-13T10:00:00Z",
    "endedAt": null,
    "visibility": "public",
    "createdAt": "2026-03-13T10:00:00Z"
  }
}
```

### `GET /v1/sessions/{sessionId}`

Response `200`:

```json
{
  "session": {
    "id": "uuid",
    "topic": "Murakami sentence rhythm",
    "subject": "Japanese literature",
    "plannedMinutes": 15,
    "actualMinutes": 15,
    "status": "completed",
    "startedAt": "2026-03-13T10:00:00Z",
    "endedAt": "2026-03-13T10:15:00Z",
    "visibility": "public",
    "createdAt": "2026-03-13T10:00:00Z",
    "updatedAt": "2026-03-13T10:15:00Z"
  },
  "note": {
    "summary": "Focused on rhythm and repetition.",
    "insight": "The pacing stayed restrained.",
    "mood": "calm",
    "tags": ["style", "rhythm"]
  }
}
```

Notes:

- `note` is nullable.
- This is the source-session hydration endpoint the mobile app uses after loading highlight detail.

### `POST /v1/sessions/{sessionId}/complete`

Request:

```json
{
  "endedAt": "2026-03-13T10:15:00Z"
}
```

Response `200`:

```json
{
  "session": {
    "id": "uuid",
    "status": "completed",
    "plannedMinutes": 15,
    "actualMinutes": 15,
    "startedAt": "2026-03-13T10:00:00Z",
    "endedAt": "2026-03-13T10:15:00Z",
    "visibility": "public"
  }
}
```

### `POST /v1/sessions/{sessionId}/cancel`

Response `200`:

```json
{
  "session": {
    "id": "uuid",
    "status": "cancelled"
  }
}
```

### `GET /v1/me/sessions`

Query params:

- `status`: optional, one of `active | completed | cancelled`
- `cursor`: optional
- `limit`: optional, `1..50`

Response `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "topic": "Murakami sentence rhythm",
      "subject": "Japanese literature",
      "plannedMinutes": 15,
      "actualMinutes": 15,
      "status": "completed",
      "startedAt": "2026-03-13T10:00:00Z",
      "endedAt": "2026-03-13T10:15:00Z",
      "visibility": "public"
    }
  ],
  "nextCursor": null,
  "hasNext": false
}
```

### `PUT /v1/sessions/{sessionId}/note`

Request:

```json
{
  "summary": "Focused on rhythm and repetition.",
  "insight": "The pacing stayed restrained.",
  "mood": "calm",
  "tags": ["style", "rhythm"]
}
```

Notes:

- `summary` is required and non-empty.
- `insight` and `mood` are nullable.
- `tags` defaults to `[]`.
- Notes are accepted only for completed sessions.

Response `200`:

```json
{
  "note": {
    "sessionId": "uuid",
    "summary": "Focused on rhythm and repetition.",
    "insight": "The pacing stayed restrained.",
    "mood": "calm",
    "tags": ["style", "rhythm"],
    "createdAt": "2026-03-13T10:16:00Z",
    "updatedAt": "2026-03-13T10:16:00Z"
  }
}
```

### `GET /v1/sessions/{sessionId}/note`

Response `200`:

```json
{
  "note": {
    "sessionId": "uuid",
    "summary": "Focused on rhythm and repetition.",
    "insight": "The pacing stayed restrained.",
    "mood": "calm",
    "tags": ["style", "rhythm"]
  }
}
```

## Highlight Endpoints

### Linkage Semantics

Every highlight exposes both linkage fields:

- `sessionId`
- `bundleId`

The backend guarantee is:

- exactly one of `sessionId` or `bundleId` is non-null
- `sourceType = "session"` means `sessionId` is authoritative and `bundleId = null`
- `sourceType = "sessionBundle"` means `bundleId` is authoritative and `sessionId = null`

Frontend expectations:

- If `sessionId` is present, the client can hydrate the source via `GET /v1/sessions/{sessionId}`.
- If `sessionId` is `null` and `bundleId` is present, the highlight is bundle-originated by design and there is no session hydration target in the current MVP slice.
- Consumers should branch on `sourceType` and the authoritative non-null linkage field, not on assumptions that every highlight has a session.

### `POST /v1/highlights`

Request for a session-originated highlight:

```json
{
  "sourceType": "session",
  "sessionId": "uuid",
  "bundleId": null,
  "title": "Murakami rhythm 15m",
  "caption": "Quiet pacing still carries forward momentum.",
  "templateCode": "mono_story_v1",
  "renderedImagePath": "content/profile-id/highlight/highlight-id/rendered/final.jpg",
  "sourcePhotoPath": null,
  "visibility": "public"
}
```

Request for a bundle-originated highlight:

```json
{
  "sourceType": "sessionBundle",
  "sessionId": null,
  "bundleId": "uuid",
  "title": "Weekly reading bundle",
  "caption": "Shared from a bundle.",
  "templateCode": "mono_story_v1",
  "renderedImagePath": "content/profile-id/highlight/highlight-id/rendered/final.jpg",
  "sourcePhotoPath": null,
  "visibility": "private"
}
```

Rules:

- `title` is required and non-empty.
- `renderedImagePath` is required and non-empty.
- `caption`, `templateCode`, and `sourcePhotoPath` are nullable.
- invalid source linkage returns `422 VALIDATION_ERROR`
- duplicate highlight for the same source returns `409 HIGHLIGHT_ALREADY_EXISTS`

Response `201`:

```json
{
  "highlight": {
    "id": "uuid",
    "sourceType": "session",
    "sessionId": "uuid",
    "bundleId": null,
    "title": "Murakami rhythm 15m",
    "caption": "Quiet pacing still carries forward momentum.",
    "templateCode": "mono_story_v1",
    "renderedImageUrl": "https://storage.niche.local/content/profile-id/highlight/highlight-id/rendered/final.jpg",
    "sourcePhotoUrl": null,
    "visibility": "public",
    "publishedAt": "2026-03-13T10:18:00Z"
  }
}
```

### `GET /v1/highlights/{highlightId}`

Response `200`:

```json
{
  "highlight": {
    "id": "uuid",
    "author": {
      "id": "uuid",
      "handle": "uuid",
      "displayName": "NichE User",
      "avatarUrl": null,
      "currentRankCode": "surface"
    },
    "sourceType": "session",
    "sessionId": "uuid",
    "bundleId": null,
    "title": "Murakami rhythm 15m",
    "caption": "Quiet pacing still carries forward momentum.",
    "templateCode": "mono_story_v1",
    "renderedImageUrl": "https://storage.niche.local/content/profile-id/highlight/highlight-id/rendered/final.jpg",
    "sourcePhotoUrl": null,
    "visibility": "public",
    "publishedAt": "2026-03-13T10:18:00Z"
  }
}
```

Notes:

- `sessionId` and `bundleId` are always present as keys, even when one is `null`.
- This is the linkage source of truth for the mobile highlight detail screen.

### `PATCH /v1/highlights/{highlightId}`

Request:

```json
{
  "title": "Updated title",
  "caption": "Updated caption",
  "visibility": "private"
}
```

Notes:

- all fields are optional
- `title`, when provided, must be non-empty
- source linkage fields are immutable

Response `200`:

```json
{
  "highlight": {
    "id": "uuid",
    "sourceType": "session",
    "sessionId": "uuid",
    "bundleId": null,
    "title": "Updated title",
    "caption": "Updated caption",
    "templateCode": "mono_story_v1",
    "renderedImageUrl": "https://storage.niche.local/content/profile-id/highlight/highlight-id/rendered/final.jpg",
    "sourcePhotoUrl": null,
    "visibility": "private",
    "publishedAt": "2026-03-13T10:18:00Z"
  }
}
```

### `GET /v1/me/highlights`

### `GET /v1/users/{profileId}/highlights`

Query params for both:

- `cursor`: optional
- `limit`: optional, `1..50`

Response `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "sourceType": "session",
      "sessionId": "uuid",
      "bundleId": null,
      "title": "Murakami rhythm 15m",
      "caption": "Quiet pacing still carries forward momentum.",
      "templateCode": "mono_story_v1",
      "renderedImageUrl": "https://storage.niche.local/content/profile-id/highlight/highlight-id/rendered/final.jpg",
      "sourcePhotoUrl": null,
      "visibility": "public",
      "publishedAt": "2026-03-13T10:18:00Z"
    }
  ],
  "nextCursor": null,
  "hasNext": false
}
```

Visibility behavior:

- `GET /v1/me/highlights` returns all of the caller's highlights
- `GET /v1/users/{profileId}/highlights` returns only public highlights unless the caller is requesting their own profile

## Archive Endpoint

### `GET /v1/me/archive`

Query params:

- `blogCursor`: optional
- `highlightCursor`: optional
- `blogLimit`: optional
- `highlightLimit`: optional

Response `200`:

```json
{
  "profile": {
    "id": "uuid",
    "handle": "uuid",
    "displayName": "NichE User",
    "bio": null,
    "avatarUrl": null,
    "currentRankCode": "surface",
    "rankScore": 0,
    "isPublic": true
  },
  "stats": {
    "totalSessions": 0,
    "totalFocusMinutes": 0,
    "totalBlogPosts": 0,
    "totalHighlights": 1,
    "currentStreakDays": 0
  },
  "blogPosts": {
    "items": [],
    "nextCursor": null,
    "hasNext": false
  },
  "highlights": {
    "items": [
      {
        "id": "uuid",
        "sourceType": "session",
        "sessionId": "uuid",
        "bundleId": null,
        "title": "Murakami rhythm 15m",
        "caption": "Quiet pacing still carries forward momentum.",
        "templateCode": "mono_story_v1",
        "renderedImageUrl": "https://storage.niche.local/content/profile-id/highlight/highlight-id/rendered/final.jpg",
        "sourcePhotoUrl": null,
        "visibility": "public",
        "publishedAt": "2026-03-13T10:18:00Z"
      }
    ],
    "nextCursor": null,
    "hasNext": false
  }
}
```

Notes:

- `highlights` is the real payload used by the mobile archive flow.
- `profile`, `stats`, and `blogPosts` are still placeholder-backed.
- empty archive is valid and returns `items: []`, not an error.
