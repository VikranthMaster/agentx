import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

def load_students() -> dict:
    with open(DATA_DIR / "students.json") as f:
        return json.load(f)

def get_student(student_id: str) -> dict | None:
    students = load_students()
    return students.get(student_id)

def load_placements() -> dict:
    with open(DATA_DIR / "placements.json") as f:
        return json.load(f)

def save_placements(data: dict):
    with open(DATA_DIR / "placements.json", "w") as f:
        json.dump(data, f, indent=2)

def load_communications() -> dict:
    with open(DATA_DIR / "communications.json") as f:
        return json.load(f)

def save_communications(data: dict):
    with open(DATA_DIR / "communications.json", "w") as f:
        json.dump(data, f, indent=2)
