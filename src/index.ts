import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  toolDefinitions,
  handleStoreMemory,
  handleSearchMemory,
  handleRetrieveMemory,
  handleRetrieveMemories
} from './mcp/tools';
import { embeddingService } from './embeddings/transformer';
import { qdrantService } from './db/qdrant';

async function main() {
  const server = new Server(
    {
      name: 'memory-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Initialize services
  console.error('Warming up services...');
  try {
    await Promise.all([
      embeddingService.init(),
      qdrantService.init()
    ]);
    console.error('Services ready.');
  } catch (error) {
    console.error('Service initialization failed. Memory features may be limited.');
    console.error(error);
  }

  // Set up tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'store_memory') {
        return await handleStoreMemory(args);
      } else if (name === 'search_memory') {
        return await handleSearchMemory(args);
      } else if (name === 'retrieve_memory') {
        return await handleRetrieveMemory(args);
      } else if (name === 'retrieve_memories') {
        return await handleRetrieveMemories(args);
      } else {
        throw new Error(`Tool not found: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Memory MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main:');
  console.error(error);
  process.exit(1);
});
