import { QdrantClient } from '@qdrant/js-client-rest';
import { embeddingService } from '../embeddings/transformer.js';

const QDRANT_URL = process.env.QDRANT_URL || 'http://127.0.0.1:6333';

export class QdrantService {
  private client: QdrantClient;

  constructor() {
    console.error(`Initializing Qdrant client at ${QDRANT_URL}`);
    this.client = new QdrantClient({ url: QDRANT_URL });
  }

  private get collectionName(): string {
    return process.env.QDRANT_COLLECTION || 'agent_memory';
  }

  async init() {
    // Ensure embedding service is initialized first to get the correct dimensions
    await embeddingService.init();
    const modelConfig = embeddingService.getConfig();
    const expectedSize = modelConfig.dims;

    console.error(`Checking Qdrant collection: ${this.collectionName} (Expected Dim: ${expectedSize})`);
    
    try {
      const collections = await this.client.getCollections();
      const collectionInfo = collections.collections.find(c => c.name === this.collectionName);

      if (collectionInfo) {
        // Validate existing collection dimensions
        const details = await this.client.getCollection(this.collectionName);
        const currentSize = (details.config.params.vectors as any).size;

        if (currentSize !== expectedSize) {
          console.error(`!!! DIMENSION MISMATCH DETECTED !!!`);
          console.error(`Existing: ${currentSize}, Required for ${modelConfig.tier} tier: ${expectedSize}`);
          console.error(`Action: AUTOMATIC RE-INDEXING for tier: ${modelConfig.id}`);
          
          // 1. Extract all existing payloads
          const memories = await this.scrollAll();
          console.error(`Backing up ${memories.length} memories for re-indexing...`);

          // 2. Re-create collection
          await this.client.deleteCollection(this.collectionName);
          await this.createCollection(expectedSize);
          
          // 3. Re-index
          if (memories.length > 0) {
            console.error(`Re-embedding ${memories.length} items...`);
            for (const memory of memories) {
              try {
                const vector = await embeddingService.embed(memory.content);
                await this.upsert(memory.id, vector, memory);
              } catch (e) {
                console.error(`Failed to re-index memory ${memory.id}:`, e);
              }
            }
            console.error(`Re-indexing complete.`);
          }
        }
      } else {
        console.error(`Creating collection: ${this.collectionName}`);
        await this.createCollection(expectedSize);
      }
    } catch (error: any) {
      if (error.data && error.data.status) {
        console.error(`Qdrant Error: ${error.data.status.error || JSON.stringify(error.data.status)}`);
      }
      console.error('Failed to connect to Qdrant or initialize collection.');
      throw error;
    }
  }

  private async scrollAll() {
    let memories: any[] = [];
    let offset: string | number | undefined | null = null;

    try {
      while (true) {
        const response: any = await this.client.scroll(this.collectionName, {
          limit: 100,
          offset,
          with_payload: true,
          with_vector: false,
        });

        memories = memories.concat(response.points.map((p: any) => p.payload));
        offset = response.next_page_offset;

        if (!offset) break;
      }
    } catch (e) {
      console.error("Error scrolling through memories:", e);
    }
    return memories;
  }

  private async createCollection(size: number) {
    await this.client.createCollection(this.collectionName, {
      vectors: {
        size: size,
        distance: 'Cosine',
      },
    });
  }

  async upsert(id: string, vector: number[], payload: any) {
    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id,
          vector,
          payload,
        },
      ],
    });
  }

  async search(vector: number[], limit: number = 5, filter?: any) {
    return await this.client.search(this.collectionName, {
      vector,
      limit,
      filter,
      with_payload: true,
    });
  }

  async retrieve(id: string) {
    const results = await this.client.retrieve(this.collectionName, {
      ids: [id],
      with_payload: true,
    });
    return results.length > 0 ? results[0] : null;
  }

  async retrieveBatch(ids: string[]) {
    return await this.client.retrieve(this.collectionName, {
      ids,
      with_payload: true,
    });
  }
}

export const qdrantService = new QdrantService();
