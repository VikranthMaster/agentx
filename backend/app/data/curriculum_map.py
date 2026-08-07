"""
Curriculum map — VCE/Osmania-style 8-semester CSE flow.
Keyed by academic year (1-4). Adjust to match your exact syllabus if needed,
or replace with a live query against the `syllabus` table later.
"""

CURRICULUM_BY_YEAR: dict[int, dict[str, list[str]]] = {
    1: {
        "completed": [
            "Programming Fundamentals (C)",
            "Mathematics I & II (Calculus, Linear Algebra)",
            "Basic Electronics & Digital Logic",
            "Engineering Drawing & Workshop",
        ],
        "in_progress": [
            "Data Structures (Arrays, Linked Lists, Stacks, Queues)",
            "Object-Oriented Programming (Java / C++)",
            "Discrete Mathematics",
        ],
    },
    2: {
        "completed": [
            "Programming Fundamentals (C)",
            "Data Structures",
            "OOP (Java / C++)",
            "Discrete Mathematics",
            "Mathematics I & II",
            "Digital Logic & Computer Organization",
        ],
        "in_progress": [
            "Design & Analysis of Algorithms (DAA)",
            "Operating Systems",
            "Database Management Systems (DBMS)",
            "Computer Networks (Introductory)",
        ],
    },
    3: {
        "completed": [
            "Data Structures",
            "OOP",
            "DAA",
            "Operating Systems",
            "DBMS",
            "Computer Networks (Intro)",
            "Computer Organization & Architecture",
        ],
        "in_progress": [
            "Compiler Design",
            "Machine Learning / AI Electives",
            "Software Engineering & SDLC",
            "Web Technologies",
        ],
    },
    4: {
        "completed": [
            "Data Structures",
            "OOP",
            "DAA",
            "Operating Systems",
            "DBMS",
            "Computer Networks",
            "Computer Organization",
            "Compiler Design",
            "Machine Learning / AI",
            "Software Engineering",
            "Web Technologies",
        ],
        "in_progress": [
            "Major Project (B.Tech Final Year Project)",
            "Elective Specializations (Cloud, Security, Data Science, etc.)",
            "Industry Internship / Research",
        ],
    },
}
