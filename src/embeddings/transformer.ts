import { pipeline, env } from '@xenova/transformers';

// Disable local model check to avoid environment issues in some CI/CD
env.allowLocalModels = false;

export class EmbeddingService {
  private pipeline: any;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    
    console.error('Initializing Transformers.js embedding pipeline...');
    this.pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    this.initialized = true;
    console.error('Embedding pipeline initialized.');
  }

  async embed(text: string): Promise<number[]> {
    await this.init();
    const output = await this.pipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }
}

export const embeddingService = new EmbeddingService();
