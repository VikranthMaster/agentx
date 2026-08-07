import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = "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"
#ANTHROPIC_API_KEY = "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"
ROUTER_MODEL = "openai/gpt-oss-120b"
REASONING_MODEL = "openai/gpt-oss-120b"
LOCAL_FALLBACK_MODEL = "llama3.1:8b"
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")
