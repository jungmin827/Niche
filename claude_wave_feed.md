# NichE Project Master Context & Text Wave Feed Implementation Guide

## 1. Role & Objective
You are Claude Code, an expert full-stack AI agent (React Native/Expo + FastAPI). Your current objective is to understand the core philosophy of the 'NichE' app, acknowledge the newly updated 4-tab navigation structure, and implement the new signature feature: the **"Text Wave (Trend Radar)" Feed**.

## 2. Core Philosophy & Design System
* **Concept:** A deep-dive tracker for intellectual hobbies (reading, observing, thinking). It borrows the achievement-sharing structure of 'Nike Run Club' but applies it to quiet, intellectual pursuits.
* **Tone & Manner:** Quiet, precise, editorial. 
* **Strict Monochrome Theme:** * Backgrounds: Pure White (`#FFFFFF`) or Deep Black (`#111111`).
  * Text: Black (`#111111`), Dark Gray (`#555555`), Light Gray (`#EFEFEA`).
  * **Rule:** ABSOLUTELY NO bright accent colors, NO gradients, NO heavy drop shadows. Rely entirely on typography (Helvetica/sans-serif), font weights, and generous whitespace to establish hierarchy.

## 3. The New 4-Tab Navigation Structure
*Discard any previous assumptions about the navigation. The app is strictly structured into 4 tabs:*
1. **Session (Main/Default):** The heart of the app. Users set up and run their focus timers (e.g., 15 mins).
2. **Feed (Text Wave):** *[TARGET OF THIS SPRINT]* A 24-hour TTL, real-time discovery space showing what others are diving into.
3. **Archive:** The user's personal profile and repository of generated Highlight templates and Blog posts.
4. **Blog:** A dedicated space for writing long-form, deep thoughts (Dump).

---

## 4. EPIC: The "Text Wave" Feed (Trend Radar)
The existing Feed concept (vertical scrolling social posts) is completely scrapped. We are building an **"Infinite Marquee Text Wave"**. It should feel like a poetic, editorial ticker tape or a modern art installation.

### 4.1. UX/UI Specification
* **Visual:** Users see titles of public highlights (from the last 24h) flowing horizontally across the screen. 
* **Parallax Layers (Crucial for depth):**
  * **Layer 1 (Background):** Huge font size, very light gray (`#EFEFEA`), extremely slow speed, flows Left-to-Right.
  * **Layer 2 (Middle):** Medium font size, dark gray (`#555555`), medium speed, flows Right-to-Left.
  * **Layer 3 (Foreground):** Regular font size, bold deep black (`#111111`), fast speed, flows Left-to-Right.
* **Interaction:** * Wrapping each text item in a `Pressable`.
  * `onPressIn`: Smoothly decelerate all animations to a pause (speed = 0) using `react-native-reanimated`.
  * `onPress`: Open a BottomSheet Modal displaying the 9:16 Highlight Template image associated with that text.
  * `onRelease` / Modal Close: Smoothly accelerate back to normal speeds.

### 4.2. Frontend Implementation Details (React Native)
* **Library:** You MUST use `react-native-reanimated` for the infinite marquee to ensure 60fps on the UI thread. Do NOT use JS-thread intervals.
* **Concept:** Duplicate the text arrays to create a seamless infinite loop utilizing `useSharedValue` and `translateX`.
* **Path to modify:** `apps/mobile/src/features/feed/screens/FeedHomeScreen.tsx` and related components.

### 4.3. Backend Implementation Details (FastAPI + Supabase)
* **Endpoint:** Define a new router `GET /api/v1/feed/wave`
* **Query Logic:**
  * Target Table: `highlights`
  * Conditions: `is_public = True` AND `created_at >= NOW() - INTERVAL '24 HOURS'`
  * Limit: Max 30-50 items to optimize frontend memory.
  * Sort: Randomize the order before returning so the wave feels dynamic on every refresh.
* **Response DTO (`WaveFeedResponse`):**
  ```json
  {
    "wave_items": [
      {
        "highlight_id": "uuid",
        "title": "Understanding Spatial Psychology",
        "author_name": "Focus_User",
        "topic": "Architecture",
        "ai_score": 88,
        "image_url": "https://supabase.../image.jpg"
      }
    ]
  }
5. Action Plan for Claude Code
Please execute the following steps in order:

Backend First: - Analyze apps/api/src/routers/feed.py and apps/api/src/services/feed_post_service.py (or highlight service).

Implement the GET /api/v1/feed/wave endpoint, its corresponding service logic (Supabase query with 24h TTL and randomness), and update the Pydantic schemas in apps/api/src/schemas/.

Frontend Data Binding: - Update apps/mobile/src/api/feed.ts and React Query hooks (apps/mobile/src/features/feed/queries.ts) to fetch this new endpoint.

Frontend UI/Animation: - Completely rewrite FeedHomeScreen.tsx.

Build a reusable TextMarquee component using react-native-reanimated.

Implement the 3 parallax layers and the pause-on-press interaction.

Modal Integration: - Ensure clicking a flowing text opens the Highlight Viewer Modal with the correct image data.

Do you understand these instructions? If so, begin with Step 1 (Backend).


---