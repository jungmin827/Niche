from __future__ import annotations

from src.ai.base import GeneratedQuiz, GradingResult, QuizAnswerGrade, QuizQuestion


def parse_generated_quiz(raw: dict) -> GeneratedQuiz:
    questions_raw = raw.get("questions")
    if not isinstance(questions_raw, list):
        raise ValueError("AI response missing 'questions' list")
    if len(questions_raw) != 3:
        raise ValueError(f"Expected exactly 3 questions, got {len(questions_raw)}")

    questions: list[QuizQuestion] = []
    for i, item in enumerate(questions_raw):
        for field in ("sequence_no", "question_type", "intent_label", "prompt_text"):
            if field not in item:
                raise ValueError(f"Question at index {i} missing field '{field}'")
        questions.append(
            QuizQuestion(
                sequence_no=item["sequence_no"],
                question_type=item["question_type"],
                intent_label=item["intent_label"],
                prompt_text=item["prompt_text"],
            )
        )

    return GeneratedQuiz(questions=questions)


def parse_grading_result(raw: dict) -> GradingResult:
    for field in ("total_score", "max_score", "overall_comment", "question_grades"):
        if field not in raw:
            raise ValueError(f"Grading response missing field '{field}'")

    grades_raw = raw["question_grades"]
    if not isinstance(grades_raw, list):
        raise ValueError("AI response 'question_grades' is not a list")
    if len(grades_raw) != 3:
        raise ValueError(f"Expected exactly 3 question grades, got {len(grades_raw)}")

    grades: list[QuizAnswerGrade] = []
    for i, item in enumerate(grades_raw):
        for field in ("sequence_no", "score", "max_score", "comment"):
            if field not in item:
                raise ValueError(f"Grade at index {i} missing field '{field}'")
        grades.append(
            QuizAnswerGrade(
                sequence_no=item["sequence_no"],
                score=item["score"],
                max_score=item["max_score"],
                comment=item["comment"],
            )
        )

    return GradingResult(
        total_score=raw["total_score"],
        max_score=raw["max_score"],
        overall_comment=raw["overall_comment"],
        question_grades=grades,
    )
