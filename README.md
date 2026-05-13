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
Stores content with an associated type and optional tags.
- `type`: 'context', 'finding', 'plan', 'summary'
- `content`: string
- `tags`: string[] (optional)

### `search_memory`
Searches for similar memory entries.
- `query`: string
- `limit`: number (default 5)
- `type_filter`: string[] (optional)

## Agent Prompt Integration

To make your agent aware of the Memory MCP, add instructions to your system prompt or OpenCode prompt files (`.opencode/prompts/`).

### Suggested Instructions
Add the following to your agent's instructions:

```text
# OPERATIONAL RULES
1. **MEMORY-FIRST**: Use the `memory` MCP server to persist technical context. Store a summary of your changes and findings using `store_memory` before finishing a task.
2. **CONTEXT RETRIEVAL**: Use `search_memory` at the start of new tasks to retrieve relevant historical context.
3. **PREFERENCE**: Prefer the memory MCP server for storing long-term context over filesystem-based `.md` files to ensure cross-agent availability.
```

### Tools
- **`store_memory`**: Save context, findings, plans, or summaries.
- **`search_memory`**: Query the vector database for similar technical context.

