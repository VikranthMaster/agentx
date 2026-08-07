import os
from dotenv import load_dotenv

load_dotenv()

#GROQ_API_KEY = "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"
GROQ_API_KEY = "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"
#ANTHROPIC_API_KEY = "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"
ROUTER_MODEL = "openai/gpt-oss-120b"
REASONING_MODEL = "openai/gpt-oss-120b"
LOCAL_FALLBACK_MODEL = "llama3.1:8b"
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")

CONTEST_API_URL = os.getenv("CONTEST_API_URL", "https://backend-2.tle-eliminators.com/public/contest-calendar/calendar-data")
CONTEST_API_SECRET = os.getenv("CONTEST_API_SECRET", "NDU5NjE5MTQ0Yzg3YTgwOGFlOGVlYTRmMDNkZDM1ZTRjZTVmZjEyNzUzYWQ4ZTQ0NzRiNjlmYTAyN2JkMmFjMA==")

