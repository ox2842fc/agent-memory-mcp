import { v4 as uuidv4 } from 'uuid';
import { embeddingService } from '../embeddings/transformer';
import { qdrantService } from '../db/qdrant';
import type { MemoryType, MemoryPayload } from '../types/memory';

export const toolDefinitions = [
  {
    name: 'store_memory',
    description: 'Stores an agent\'s context, finding, plan, or completed task summary.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['context', 'finding', 'plan', 'summary'],
          description: 'The type of memory being stored'
        },
        content: {
          type: 'string',
          description: 'The text content to store'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags for filtering'
        },
        artifact_path: {
          type: 'string',
          description: 'Optional path to related artifact'
        },
        artifact_kind: {
          type: 'string',
          description: 'Optional kind of artifact (e.g. build, log, code)'
        }
      },
      required: ['type', 'content']
    }
  },
  {
    name: 'retrieve_memory',
    description: 'Retrieves a specific memory by its exact Qdrant point ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The exact UUID of the memory to retrieve'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'retrieve_memories',
    description: 'Retrieves multiple memories by their exact Qdrant point IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'The exact UUIDs of the memories to retrieve'
        }
      },
      required: ['ids']
    }
  },
  {
    name: 'search_memory',
    description: 'Queries stored reference tasks or contexts based on semantic similarity.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The natural language query'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 5
        },
        type_filter: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional filter by memory types'
        }
      },
      required: ['query']
    }
  }
];

export async function handleStoreMemory(args: any) {
  const { type, content, tags, artifact_path, artifact_kind } = args;
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  
  const vector = await embeddingService.embed(content);
  
  const payload: MemoryPayload = {
    id,
    type: type as MemoryType,
    content,
    timestamp,
    tags,
    artifact_path,
    artifact_kind
  };
  
  await qdrantService.upsert(id, vector, payload);
  
  return {
    content: [{ type: 'text', text: JSON.stringify({ message: `Memory stored successfully`, id, type, artifact_path }) }]
  };
}

export async function handleSearchMemory(args: any) {
  const { query, limit = 5, type_filter } = args;
  
  const vector = await embeddingService.embed(query);
  
  let filter: any = undefined;
  if (type_filter && type_filter.length > 0) {
    filter = {
      must: [
        {
          key: 'type',
          match: { any: type_filter }
        }
      ]
    };
  }
  
  const results = await qdrantService.search(vector, limit, filter);
  
  const formattedResults = results.map(r => ({
    score: r.score,
    id: r.payload?.id,
    content: r.payload?.content,
    type: r.payload?.type,
    timestamp: r.payload?.timestamp,
    tags: r.payload?.tags,
    artifact_path: r.payload?.artifact_path,
    artifact_kind: r.payload?.artifact_kind
  }));
  
  return {
    content: [{ type: 'text', text: JSON.stringify(formattedResults, null, 2) }]
  };
}

export async function handleRetrieveMemory(args: any) {
  const { id } = args;
  const result = await qdrantService.retrieve(id);
  
  if (!result) {
    return {
      content: [{ type: 'text', text: `Memory with ID ${id} not found.` }],
      isError: true
    };
  }
  
  return {
    content: [{ type: 'text', text: JSON.stringify(result.payload, null, 2) }]
  };
}

export async function handleRetrieveMemories(args: any) {
  const { ids } = args;
  const results = await qdrantService.retrieveBatch(ids);
  
  const payloads = results.map(r => r.payload);
  
  return {
    content: [{ type: 'text', text: JSON.stringify(payloads, null, 2) }]
  };
}
