from pathlib import Path
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_community.document_loaders import TextLoader
from app.config import CHROMA_PERSIST_DIR
# Use this instead
from langchain_text_splitters import RecursiveCharacterTextSplitter


POLICIES_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "policies"

# local embeddings via Ollama — free, no API calls for embedding
embeddings = OllamaEmbeddings(model="nomic-embed-text")

_vectorstore = None

def get_vectorstore():
    global _vectorstore
    if _vectorstore is not None:
        return _vectorstore

    docs = []
    splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=50)
    for file in POLICIES_DIR.glob("*.txt"):
        loader = TextLoader(str(file))
        loaded = loader.load()
        docs.extend(splitter.split_documents(loaded))

    _vectorstore = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory=CHROMA_PERSIST_DIR,
    )
    return _vectorstore
