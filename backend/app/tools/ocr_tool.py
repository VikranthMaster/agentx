import io
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes

def extract_text_from_image_bytes(file_bytes: bytes) -> str:
    img = Image.open(io.BytesIO(file_bytes))
    return pytesseract.image_to_string(img)

def extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    pages = convert_from_bytes(file_bytes)
    return "\n\n".join(pytesseract.image_to_string(p) for p in pages)

def extract_text(filename: str, file_bytes: bytes) -> str:
    ext = filename.lower().rsplit(".", 1)[-1]
    if ext == "pdf":
        return extract_text_from_pdf_bytes(file_bytes)
    return extract_text_from_image_bytes(file_bytes)