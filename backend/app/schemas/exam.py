from typing import List
from pydantic import BaseModel, Field

class question_grade(BaseModel):
    question_number: str
    marks_awarded: float
    marks_total: float
    feedback: str

class exam_assessment(BaseModel):
    student_answer_text: str
    total_score: float
    total_possible: float
    per_question: List[question_grade]
    overall_feedback: str