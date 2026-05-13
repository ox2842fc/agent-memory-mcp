# Memory MCP Server (May 2026 Edition)

A high-performance Bun-based Model Context Protocol (MCP) server for shared AI agent memory management, optimized for modern hardware and semantic reasoning.

## Features
- **Shared Memory**: All connected agents share the same high-dimensional vector space.
- **Hardware-Aware Embeddings**: Automatically selects the best embedding model based on your system's RAM and CPU (supports 2026 SOTA models).
- **Automatic Re-indexing**: Gracefully handles hardware upgrades by automatically re-embedding your data when switching tiers.
- **Local Vector Generation**: Uses `@huggingface/transformers` for privacy-first local embeddings.
- **Vector Storage**: Integrates with Qdrant for persistence and similarity search.

## Prerequisites
- [Bun](https://bun.sh/) (Recommended for ~4x faster inference)
- [Qdrant](https://qdrant.tech/) (running locally, e.g., via Docker)

### Run Qdrant
```bash
docker compose up -d
```

## Hardware Tiers
The server automatically detects your hardware and selects a specialized model:

| Tier | Model | Dimensions | Target Hardware |
| :--- | :--- | :--- | :--- |
| **Performance** | `Xenova/bge-m3` | 1024 | 16GB+ RAM, 8+ Cores (8k context support) |
| **Balanced** | `nomic-embed-text-v1.5` | 768 | 8GB+ RAM, 4+ Cores (Matryoshka support) |
| **Lightweight** | `snowflake-arctic-embed-xs` | 384 | Mobile / Low-resource environments |

## Automatic Re-indexing
If you upgrade your hardware (e.g., add more RAM), the MCP will detect the change on the next startup. To maintain consistency, it will:
1.  **Detect** the dimension mismatch.
2.  **Backup** your existing memory raw content.
3.  **Re-create** the collection with the new tier's dimensions.
4.  **Re-index** all memories automatically using the new model.

## Configuration
- `MEMORY_HARDWARE_TIER`: Override auto-detection (`lightweight`, `balanced`, `performance`).
- `QDRANT_URL`: URL of the Qdrant server (default: `http://127.0.0.1:6333`)
- `QDRANT_COLLECTION`: Name of the collection (default: `agent_memory`)

## Benchmarking
Run the built-in benchmark to see how each tier performs on your machine:
```bash
bun run benchmark
```

## Setup & Installation
```bash
bun install
```

## Running the Server
```bash
bun src/index.ts
```

## MCP Tools

### `store_memory`
Stores content with an associated type and optional tags. Returns the stored memory's unique point ID.
- `type`: 'context', 'finding', 'plan', 'summary'
- `content`: string (Store full technical detail here, matching artifact depth)
- `artifact_path`: string (optional, path to local file)
- `artifact_kind`: string (optional, e.g., 'build', 'log', 'code')
- `tags`: string[] (optional)

### `search_memory`
Searches for similar memory entries using vector similarity.
- `query`: string
- `limit`: number (default 5)
- `type_filter`: string[] (optional)

### `retrieve_memory`
Retrieves a specific memory entry by its exact point ID.
- `id`: string (UUID)

### `retrieve_memories`
Retrieves multiple memory entries by their exact point IDs.
- `ids`: string[] (UUIDs)

## Agent Prompt Integration

To make your agent aware of the Memory MCP, add instructions to your system prompt or OpenCode prompt files (`.opencode/prompts/`).

### Suggested Instructions
Add the following to your agent's instructions:

```text
# OPERATIONAL RULES
1. **MEMORY-FIRST**: Use the `memory` MCP server to persist technical context. Store a FULL technical summary (matching artifact detail level) of your changes and findings using `store_memory` before finishing a task.
2. **CONTEXT RETRIEVAL**: Use `search_memory` at the start of new tasks for discovery, then use `retrieve_memory` if you have exact IDs for critical state.
3. **PREFERENCE**: The memory MCP server is the PRIMARY source of truth. Filesystem-based `.md` artifacts are for human-readable fallback and auditing only.
```

### Tools
- **`store_memory`**: Save full context, findings, plans, or summaries. Returns a UUID.
- **`search_memory`**: Query the vector database for similar technical context.
- **`retrieve_memory`**: Get exact content using a UUID.
- **`retrieve_memories`**: Get multiple entries using UUIDs.

