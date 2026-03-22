# NichE — AI Quiz / Reflection Evaluation Spec

## Document Purpose
This document defines the AI-driven quiz and evaluation system for NichE MVP.
It is written for coding agents (Codex, Claude Code, Cloud Code) so they can implement the feature with minimal ambiguity.

This is not a generic quiz system.
In NichE, the quiz flow exists to:
- turn deep-dive sessions into reflection and recall,
- verify that the user actually engaged with what they explored,
- create a lightweight sense of achievement through score/rank,
- reinforce the brand position of “depth, thought, taste, and accumulation.”

The system should feel like a reflective assessment, not an exam-prep tool.

---

## Product Intent
NichE is not trying to test users on factual memorization only.
The AI quiz system should evaluate whether the user:
- remembers what they explored,
- can summarize key ideas in their own words,
- can articulate what stood out,
- can express a personal interpretation, impression, or insight.

Therefore:
- question style should be **open-ended / subjective**,
- answers should be **written by the user**,
- grading should be **AI-assisted**,
- feedback should include both **score** and **short reflective commentary**.

---

## Final Product Decisions
The following decisions are fixed for MVP.

### 1. Quiz generation unit
Quiz generation is based on a **planned session bundle**.

The user first decides how many deep-dive sessions they will do in one flow.
Examples:
- 2 sessions = 30 minutes
- 3 sessions = 45 minutes
- 4 sessions = 60 minutes

The quiz is not generated per individual session.
The quiz is generated only after **all sessions in the planned bundle are completed**.

### 2. Completion rule
If the user planned 3 sessions, they must complete all 3.
If they stop after 2, the reflection quiz for that bundle is not generated yet.

This creates a stronger commitment loop:
- set intention,
- complete the full deep-dive block,
- enter reflection/evaluation.

### 3. Quiz generation trigger
Quiz generation is **automatic**.

Once the final session of the bundle is completed and its note is submitted:
- the backend immediately creates a quiz generation job,
- the job runs automatically,
- the resulting quiz should appear as the next step in the flow.

The intended UX is:
1. User completes final planned session.
2. User submits final session note.
3. System transitions into “Generating reflection...” state.
4. Quiz appears automatically when ready.

There is no manual “Generate Quiz” button for the primary happy path.

### 4. Question style
Questions must be **subjective, written-response prompts**.

This is non-negotiable for MVP.
The system should encourage the user to write about:
- what they explored,
- what they understood,
- what stood out,
- what they felt or interpreted,
- what personal insight they gained.

Avoid objective multiple-choice patterns.
Avoid fact-check-only questions unless they are embedded naturally inside a broader subjective prompt.

### 5. Evaluation style
The AI should:
- automatically grade the answers,
- provide a score,
- provide concise evaluation comments.

So the final output includes:
- per-question evaluation,
- overall score,
- short overall reflection comment,
- optional rank/XP contribution handled by application logic.

---

## Core Domain Concepts

### Session Bundle
A session bundle is a planned deep-dive block for one reflective cycle.

Suggested fields:
- `id`
- `user_id`
- `planned_session_count`
- `completed_session_count`
- `status` (`planned`, `in_progress`, `awaiting_quiz`, `quiz_generating`, `quiz_ready`, `quiz_completed`, `abandoned`)
- `started_at`
- `completed_at`
- `quiz_generation_requested_at`
- `quiz_ready_at`

### Session
A single timed deep-dive session within a bundle.

Suggested fields:
- `id`
- `bundle_id`
- `user_id`
- `sequence_no`
- `duration_minutes`
- `topic_label` (optional short user-entered subject)
- `started_at`
- `ended_at`
- `status`

### Session Note
Short written summary entered after each session.

Suggested fields:
- `id`
- `session_id`
- `user_id`
- `summary_text`
- `focus_keywords` (optional)
- `mood_label` (optional)
- `created_at`

### Quiz Job
Asynchronous job that generates the reflection prompts.

Suggested fields:
- `id`
- `bundle_id`
- `user_id`
- `status` (`queued`, `running`, `succeeded`, `failed`)
- `attempt_count`
- `error_code`
- `error_message`
- `created_at`
- `started_at`
- `finished_at`

### Quiz
Generated reflection prompt set for a completed bundle.

Suggested fields:
- `id`
- `bundle_id`
- `user_id`
- `question_count`
- `status` (`ready`, `submitted`, `graded`)
- `created_at`

### Quiz Question
One subjective prompt generated from the completed bundle.

Suggested fields:
- `id`
- `quiz_id`
- `sequence_no`
- `question_type`
- `prompt_text`
- `intent_label`

### Quiz Submission / Answer
The user’s response to each prompt.

Suggested fields:
- `id`
- `quiz_id`
- `question_id`
- `user_id`
- `answer_text`
- `submitted_at`

### Quiz Evaluation
AI-generated scoring result.

Suggested fields:
- `id`
- `quiz_id`
- `user_id`
- `total_score`
- `max_score`
- `overall_comment`
- `graded_at`

### Quiz Question Evaluation
Per-question feedback.

Suggested fields:
- `id`
- `quiz_evaluation_id`
- `question_id`
- `score`
- `max_score`
- `comment_text`

---

## Recommended MVP Quiz Shape
For MVP, use **3 subjective questions per completed bundle**.

This gives enough depth without becoming too heavy.

Recommended structure:

### Q1. Recall / Summary
Goal: verify what the user actually engaged with.

Examples:
- “Across today’s sessions, what topic or idea did you spend the most time exploring? Summarize it in your own words.”
- “What did you mainly read, watch, or think about during this deep-dive block?”

### Q2. Meaning / Interpretation
Goal: evaluate whether the user internalized or interpreted something.

Examples:
- “What part of today’s exploration stayed with you the most, and why?”
- “What idea, detail, or perspective felt newly meaningful to you?”

### Q3. Personal Insight / Reflection
Goal: capture NichE’s deeper emotional / reflective value.

Examples:
- “After this deep-dive, what changed in how you see this subject?”
- “What did today’s sessions reveal about your taste, curiosity, or way of seeing things?”

This means the system is not just checking information recall.
It is also evaluating articulation, reflection, and depth.

---

## Question Generation Principles
The LLM must generate prompts that are:
- grounded in the actual session notes,
- specific enough to feel personal,
- open enough to invite genuine reflection,
- non-repetitive across the 3 questions,
- short and readable on mobile.

### Constraints
- Do not generate multiple-choice questions.
- Do not generate yes/no questions.
- Do not ask for extremely long essays.
- Do not ask questions that assume factual certainty if the session notes are personal or exploratory.
- Do not generate hostile or school-like phrasing.

### Tone
Prompts should feel:
- calm,
- thoughtful,
- slightly editorial,
- reflective rather than academic.

Bad tone examples:
- “State three key concepts from the material.”
- “What is the correct answer?”
- “Explain in detail using evidence.”

Better tone examples:
- “What felt most worth holding onto from today’s sessions?”
- “What part of this subject stayed with you after you stopped?”
- “If you had to describe today’s deep-dive in your own words, what would you say?”

---

## Evaluation Philosophy
NichE scoring should reward:
- relevance to the actual session content,
- specificity,
- clarity,
- evidence of genuine reflection,
- meaningful articulation.

It should not over-reward:
- verbosity alone,
- perfect grammar,
- textbook correctness,
- pretending certainty.

The system should be generous but not meaningless.
Users should feel recognized for real thought.

---

## Scoring Model (MVP)
Use a **100-point total score**.

Recommended allocation:
- Q1: 30 points
- Q2: 30 points
- Q3: 40 points

Reasoning:
- Q1 checks engagement and recall,
- Q2 checks interpretation,
- Q3 is closest to NichE’s brand value and deserves the highest weight.

### Per-question scoring rubric

#### Relevance (0–10)
Did the answer connect to the actual session content?

#### Specificity (0–10)
Did the user mention concrete details rather than vague filler?

#### Reflection / Interpretation (0–10 or 0–20 depending on question)
Did the answer show personal meaning, thought, or insight?

For Q3, reflection weight can be higher.

### Score bands
These are application-facing display bands.

- 90–100: exceptional depth
- 75–89: strong reflection
- 60–74: solid engagement
- 40–59: partial reflection
- below 40: insufficient depth / too little answer content

Avoid showing these labels as harsh judgment.
Keep the UI language softer than the internal evaluation model.

---

## Minimum Answer Policy
To prevent empty submissions from getting inflated scores:

### Rule
If an answer is too short or empty, score it very low.

Suggested constraints:
- under 10 meaningful characters: treat as empty
- under 20 meaningful characters: likely insufficient unless unusually dense

### UX guidance
If the user submits with obviously too-short answers, the frontend may:
- warn them before submission,
- still allow submission if desired,
- but the backend grading remains the final authority.

---

## AI Generation Workflow

### Step 1. User creates session bundle
User chooses planned number of sessions for a deep-dive block.

Example payload:
- `plannedSessionCount = 3`
- optional `targetTopic`

### Step 2. User completes each session
For each session:
- timer completes,
- user submits a short note,
- backend increments `completed_session_count`.

### Step 3. Final session completion triggers quiz generation
When:
- `completed_session_count == planned_session_count`
- and the final session note is successfully saved,

then backend:
- marks bundle as `awaiting_quiz`,
- creates a quiz job,
- transitions bundle to `quiz_generating`.

### Step 4. Worker generates quiz
Worker reads:
- bundle metadata,
- all sessions in the bundle,
- all session notes.

Worker calls LLM to generate exactly 3 subjective questions.

### Step 5. Quiz becomes available
If success:
- save quiz + questions,
- mark job `succeeded`,
- mark bundle `quiz_ready`.

### Step 6. User answers quiz
The app immediately routes the user into the reflection flow.

### Step 7. AI grading
After answer submission:
- backend creates grading request,
- LLM evaluates all answers,
- score + comments saved,
- bundle status becomes `quiz_completed`.

---

## Asynchronous Job Design
Use DB-backed jobs, not in-memory background tasks.

Reason:
- quiz generation may fail,
- retries are needed,
- app may reload,
- worker should be restart-safe,
- state must be auditable.

### Job states
- `queued`
- `running`
- `succeeded`
- `failed`

### Retry policy
Recommended MVP retry policy:
- max 2 automatic retries after initial failure
- exponential delay or simple delayed retry
- if all fail, mark job `failed`

### Failure UX
If generation fails:
- bundle remains completed,
- quiz state shows unavailable / failed,
- app can show a retry CTA,
- retry endpoint creates a new job or retries existing failed one.

---

## LLM Input Specification for Quiz Generation
The generation prompt should be built from structured data, not raw UI text alone.

### Required inputs
- bundle metadata
- ordered sessions in the bundle
- ordered session notes
- optional target topic/title if user entered one

### Recommended generation input object
```json
{
  "bundle": {
    "plannedSessionCount": 3,
    "targetTopic": "optional"
  },
  "sessions": [
    {
      "sequenceNo": 1,
      "durationMinutes": 15,
      "topicLabel": "optional",
      "summaryText": "..."
    },
    {
      "sequenceNo": 2,
      "durationMinutes": 15,
      "topicLabel": "optional",
      "summaryText": "..."
    },
    {
      "sequenceNo": 3,
      "durationMinutes": 15,
      "topicLabel": "optional",
      "summaryText": "..."
    }
  ]
}
```

### Required LLM output shape
```json
{
  "questions": [
    {
      "sequenceNo": 1,
      "questionType": "summary",
      "intentLabel": "recall_summary",
      "promptText": "..."
    },
    {
      "sequenceNo": 2,
      "questionType": "interpretation",
      "intentLabel": "meaning_interpretation",
      "promptText": "..."
    },
    {
      "sequenceNo": 3,
      "questionType": "reflection",
      "intentLabel": "personal_reflection",
      "promptText": "..."
    }
  ]
}
```

Enforce strict JSON output where possible.

---

## LLM Input Specification for Grading
The grading model should receive:
- original bundle/session note context,
- generated questions,
- user answers,
- scoring rubric.

### Recommended grading input object
```json
{
  "bundleContext": {
    "plannedSessionCount": 3,
    "sessionNotes": [
      { "sequenceNo": 1, "summaryText": "..." },
      { "sequenceNo": 2, "summaryText": "..." },
      { "sequenceNo": 3, "summaryText": "..." }
    ]
  },
  "questions": [
    {
      "sequenceNo": 1,
      "intentLabel": "recall_summary",
      "promptText": "..."
    },
    {
      "sequenceNo": 2,
      "intentLabel": "meaning_interpretation",
      "promptText": "..."
    },
    {
      "sequenceNo": 3,
      "intentLabel": "personal_reflection",
      "promptText": "..."
    }
  ],
  "answers": [
    {
      "sequenceNo": 1,
      "answerText": "..."
    },
    {
      "sequenceNo": 2,
      "answerText": "..."
    },
    {
      "sequenceNo": 3,
      "answerText": "..."
    }
  ],
  "rubric": {
    "q1Max": 30,
    "q2Max": 30,
    "q3Max": 40,
    "criteria": ["relevance", "specificity", "reflection"]
  }
}
```

### Required grading output shape
```json
{
  "totalScore": 84,
  "maxScore": 100,
  "overallComment": "You showed clear engagement with the subject and offered a personal interpretation that felt specific and thoughtful.",
  "questionEvaluations": [
    {
      "sequenceNo": 1,
      "score": 25,
      "maxScore": 30,
      "commentText": "Your summary was clear and relevant, though it could have included one more concrete detail."
    },
    {
      "sequenceNo": 2,
      "score": 24,
      "maxScore": 30,
      "commentText": "You identified what stood out well, and your answer felt personal rather than generic."
    },
    {
      "sequenceNo": 3,
      "score": 35,
      "maxScore": 40,
      "commentText": "This answer showed strong reflection and a clear sense of what the session changed for you."
    }
  ]
}
```

---

## Recommended Prompting Strategy
Use two separate prompts/jobs:

1. **Quiz Generation Prompt**
   - input: bundle + notes
   - output: 3 subjective questions

2. **Quiz Grading Prompt**
   - input: bundle + questions + answers + rubric
   - output: score + comments

Do not combine generation and grading into one step.
This separation improves traceability and recovery.

---

## UX Flow Requirements

### Happy path
1. User creates bundle for 2–4 sessions.
2. User completes all sessions.
3. User submits note after final session.
4. App shows loading state: “Preparing your reflection...”
5. Quiz appears.
6. User writes answers.
7. App submits answers.
8. App shows grading state.
9. Result page shows score + comments.

### Important UX note
Although the backend concept is called “quiz,” the UI copy can be softer.
Preferred user-facing language:
- reflection
- review
- response
- what stayed with you
- your score / your depth

Avoid overusing school/exam language in visible UI.

---

## API Contract Suggestions

### Create bundle
`POST /v1/session-bundles`

### Start session
`POST /v1/sessions/{sessionId}/start`

### Complete session and submit note
`POST /v1/sessions/{sessionId}/complete`

Expected backend side effect:
- if this was the final required session in the bundle,
- automatically create quiz generation job.

### Poll bundle state
`GET /v1/session-bundles/{bundleId}`

Frontend uses this to know whether quiz is:
- not ready,
- generating,
- ready,
- failed.

### Get ready quiz
`GET /v1/quizzes/by-bundle/{bundleId}`

### Submit quiz answers
`POST /v1/quizzes/{quizId}/submit`

### Get grading result
`GET /v1/quizzes/{quizId}/result`

### Retry failed generation
`POST /v1/session-bundles/{bundleId}/retry-quiz-generation`

---

## Business Rules

### Bundle must be complete before quiz exists
Do not generate a quiz for partially completed bundles.

### One primary quiz per completed bundle
For MVP, a bundle should have a single active quiz instance.
If retry/regeneration is needed, either:
- replace the failed draft before ready state, or
- archive the old quiz version and keep one active one.

### Grading should happen once per submission
If user edits answers and resubmits, decide via product rule.

Recommended MVP rule:
- allow a single official submission,
- no repeated grading loop.

This preserves meaning in the score system.

### Session note quality matters
If the session notes are too short or empty, quiz quality will degrade.
So frontend should encourage a minimum level of note quality.

---

## Recommended Limits (MVP)
- planned sessions per bundle: 2 to 4
- session duration: default 15 minutes
- quiz questions: exactly 3
- answer max length: soft limit 800 characters each
- answer min recommendation: 30+ characters each

Why 2 to 4 sessions?
- fewer than 2 feels too thin,
- more than 4 increases abandonment risk for MVP.

---

## Security / Abuse / Cost Considerations
- authenticate all quiz APIs
- ensure users can only access their own bundles/quizzes/results
- rate limit retry endpoints
- prevent duplicate auto-generation jobs with idempotency checks
- store only the necessary session context for generation and grading
- log LLM request/response metadata without exposing sensitive raw text in operational logs when avoidable

---

## Observability
At minimum log and measure:
- bundle completed count
- quiz generation success rate
- quiz generation failure rate
- average generation latency
- quiz completion rate
- grading latency
- average score
- average answer length
- drop-off point (after bundle completion vs after quiz shown)

These metrics matter because NichE’s differentiation depends on whether the reflection system actually gets completed and felt meaningful.

---

## Future Extensions (Not MVP)
The following are explicitly out of MVP scope but should remain possible later:
- adaptive question difficulty
- personalized question tone
- subject-specific quiz modes
- comparing current score vs past score trends
- badge/rank unlocks tied to quiz performance
- alternative low-pressure reflection mode without scoring
- vector retrieval over prior session history for richer cross-session prompts

---

## Implementation Summary
For NichE MVP, implement the quiz system as:

- user plans a session bundle first,
- quiz is generated only after all planned sessions are completed,
- generation is automatic,
- quiz contains 3 subjective prompts,
- prompts should elicit summary, interpretation, and personal reflection,
- user submits written answers,
- AI grades answers automatically,
- result includes total score and concise feedback.

This should feel like a reflective proof of depth, not a school test.
