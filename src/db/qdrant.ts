import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_URL = process.env.QDRANT_URL || 'http://127.0.0.1:6333';
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'agent_memory';

export class QdrantService {
  private client: QdrantClient;

  constructor() {
    console.error(`Initializing Qdrant client at ${QDRANT_URL}`);
    this.client = new QdrantClient({ url: QDRANT_URL });
  }

  async init() {
    console.error(`Checking Qdrant collection: ${COLLECTION_NAME}`);
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

      if (!exists) {
        console.error(`Creating collection: ${COLLECTION_NAME}`);
        await this.client.createCollection(COLLECTION_NAME, {
          vectors: {
            size: 384, // dimension for Xenova/all-MiniLM-L6-v2
            distance: 'Cosine',
          },
        });
      }
    } catch (error) {
      console.error('Failed to connect to Qdrant. Ensure Qdrant is running.');
      throw error;
    }
  }

  async upsert(id: string, vector: number[], payload: any) {
    await this.client.upsert(COLLECTION_NAME, {
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
    return await this.client.search(COLLECTION_NAME, {
      vector,
      limit,
      filter,
      with_payload: true,
    });
  }
}

export const qdrantService = new QdrantService();
