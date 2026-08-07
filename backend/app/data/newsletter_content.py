"""
Hardcoded newsletter content — edit by hand each week.
Phase 2 idea: replace with a RAG/websearch job that regenerates this automatically.
"""

NEWSLETTER_SUBJECT = "🚀 This Week in Tech — Smart Campus Digest"

NEWSLETTER_ITEMS = [
    {
        "title": "Gemini 2.5 Pro Beats GPT-4o on Coding Benchmarks",
        "summary": (
            "Google DeepMind's Gemini 2.5 Pro sets a new SOTA on SWE-Bench Verified (63.8%) "
            "and HumanEval, outperforming GPT-4o on agentic code tasks. Biggest differentiator: "
            "long-context reasoning up to 1M tokens natively."
        ),
        "link": "https://deepmind.google/technologies/gemini/",
        "tag": "AI / LLMs",
    },
    {
        "title": "Meta Releases LLaMA 3.3 70B — Matches 405B at a Fraction of the Cost",
        "summary": (
            "Meta's LLaMA 3.3 70B achieves near-parity with its 405B sibling on MMLU, "
            "GPQA, and IFEval while requiring 6× fewer GPU hours. Groq inference is already live."
        ),
        "link": "https://ai.meta.com/blog/meta-llama-3-3/",
        "tag": "Open Source LLMs",
    },
    {
        "title": "Agent2Agent (A2A) Protocol — Google's Open Standard for Multi-Agent Communication",
        "summary": (
            "Google's A2A protocol defines a JSON-RPC-based standard so agents from different "
            "frameworks (LangGraph, AutoGen, CrewAI) can discover and call each other without "
            "bespoke glue code. Over 50 partners have already adopted it."
        ),
        "link": "https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/",
        "tag": "Multi-Agent Systems",
    },
    {
        "title": "Rust Overtakes Java in GitHub Trending for the Third Month Running",
        "summary": (
            "Rust's memory-safety guarantees and zero-cost abstractions continue to attract "
            "backend and systems engineers. The Linux kernel now ships Rust modules in stable "
            "releases, cementing its production-grade status."
        ),
        "link": "https://github.blog/developer-skills/programming-languages-and-frameworks/",
        "tag": "Systems Programming",
    },
    {
        "title": "ChromaDB 0.6 Ships Native Multi-Tenant Embeddings with Streaming",
        "summary": (
            "ChromaDB's latest release adds per-tenant embedding namespaces, a streaming ingest "
            "API, and a 40% reduction in cold-start latency — making it even easier to build "
            "RAG pipelines that scale from prototype to production without changing the interface."
        ),
        "link": "https://www.trychroma.com/",
        "tag": "Vector Databases / RAG",
    },
]
