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

## Troubleshooting: Slow First Startup
The first time you run this MCP server, it may download large embedding models (up to several hundred MBs) into `~/.cache/agent-memory-mcp`. This process can take a significant amount of time depending on your internet connection.

### Extending Timeout for OpenCode
If OpenCode fails to connect due to a timeout during the initial model download, you can increase the timeout in your configuration:

```json
{
  "mcpServers": {
    "memory": {
      "command": "bun",
      "args": ["/absolute/path/to/agent-memory-mcp/src/index.ts"],
      "timeout": 120000 
    }
  }
}
```

### Warm-up Workaround
To avoid timeout issues during the first startup, you can manually trigger the model download before connecting the MCP to OpenCode. Run a quick warm-up command in your terminal:

```bash
bun run benchmark
```
*(Note: You can also use `bun test` if tests are configured, or any command that initializes the embedding service.)*

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
Retrieves a specific memory entry by its exact point ID. Returns an error if the ID is not found.
- `id`: string (UUID)

### `retrieve_memories`
Retrieves multiple memory entries by their exact point IDs.
- `ids`: string[] (UUIDs)

## Agent Integration Guide

### Memory Architecture
This MCP uses a **flat memory model**. Each memory has a unique UUID, a type, content, and optional tags.
- **No native relation graph**: There is no built-in parent/child or dependency tracking.
- **ID Chaining**: Relation-graphs must be simulated by agents manually embedding prior memory IDs in their content or specific fields (e.g., `HISTORICAL MEMORY IDs`).
- **Tagging**: Tags are stored and returned but **not filterable** via `search_memory`. Use them for human-readable metadata only.

### MEMORY-FIRST Rule (Canonical)
> **search_memory or retrieve_memory BEFORE acting. store_memory BEFORE reporting.**

1.  **RETRIEVE FIRST**: At task start, call `search_memory` (using `type_filter`) or `retrieve_memory` (if IDs were provided by the caller).
2.  **STORE BEFORE REPORTING**: Before emitting your final response, call `store_memory`. Capture the returned UUID and include it in your output.
3.  **ZERO-RESULTS FALLBACK**: If `search_memory` returns `[]`, proceed with available context, note the absence in your `OPEN_ITEMS`, and do not block execution.

### Retrieval Strategy by Phase
Use `type_filter` to minimize noise during discovery and execution:

| Phase | `type_filter` Recommendation |
| :--- | :--- |
| **Discovery** | `['finding', 'context']` |
| **Planning** | `['finding', 'plan']` |
| **Execution** | `['plan', 'summary']` |
| **Completion** | `['summary', 'plan']` |

### Storage Convention
Required tags at minimum: `[agent-role, phase-name]` (e.g., `["explore", "discovery"]`).

### Worked Example
```json
// 1. Search for context
search_memory({ "query": "auth module implementation", "type_filter": ["finding"] })

// 2. Store your progress
store_memory({
  "type": "finding",
  "content": "SUMMARY: Analyzed auth logic.\nFINDINGS: Found bypass in line 42.\nHISTORICAL MEMORY IDs: <prior-id>",
  "tags": ["explore", "discovery", "auth"]
})
// Returns: { "id": "uuid-123-..." }
```

