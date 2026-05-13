# Memory MCP Server

A Bun-based Model Context Protocol (MCP) server for shared AI agent memory management.

## Features
- **Shared Memory**: All connected agents share the same vector space.
- **Local Embeddings**: Uses `Transformers.js` (`all-MiniLM-L6-v2`) for local vector generation.
- **Vector Storage**: Integrates with Qdrant for persistence and similarity search.

## Prerequisites
- [Bun](https://bun.sh/)
- [Qdrant](https://qdrant.tech/) (running locally, e.g., via Docker)

### Run Qdrant
You can run Qdrant using Docker directly:
```bash
docker run -p 6333:6333 qdrant/qdrant
```
Or use the provided `docker-compose.yml`:
```bash
docker compose up -d
```

## Configuration
The server can be configured via environment variables:
- `QDRANT_URL`: URL of the Qdrant server (default: `http://127.0.0.1:6333`)
- `QDRANT_COLLECTION`: Name of the collection to use (default: `agent_memory`)

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

