from fastapi import APIRouter, File, UploadFile, Form
from app.tools.ocr_tool import extract_text
from app.schemas.exam import exam_assessment
from app.config import GROQ_API_KEY

router = APIRouter(tags=["Exam Assessment (OCR)"])

@router.post("/api/exam/assess")
async def assess_exam(
    rubric: str = Form(...),          # answer key / grading rubric, plain text
    answer_sheet: UploadFile = File(...),
):
    content = await answer_sheet.read()
    ocr_text = extract_text(answer_sheet.filename, content)

    from langchain_groq import ChatGroq
    llm = ChatGroq(api_key=GROQ_API_KEY, model="llama-3.3-70b-versatile", temperature=0)
    structured_llm = llm.with_structured_output(exam_assessment)

    prompt = f"""You are grading a scanned student answer sheet, OCR-extracted below.
Grade STRICTLY against the rubric. Never invent marks not justified by the rubric.

RUBRIC / ANSWER KEY:
{rubric}

OCR-EXTRACTED STUDENT ANSWER TEXT:
{ocr_text[:8000]}
"""
    result = structured_llm.invoke(prompt)
    return {"status": "success", "ocr_text": ocr_text, "assessment": result.model_dump()}