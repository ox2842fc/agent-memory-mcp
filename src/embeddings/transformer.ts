import { pipeline, env } from '@huggingface/transformers';
import os from 'os';

// Configure environment for node environment
env.allowLocalModels = false;
env.cacheDir = './.cache';

export type HardwareTier = 'lightweight' | 'balanced' | 'performance';

export interface ModelConfig {
  id: string;
  tier: HardwareTier;
  dims: number;
  description: string;
}

const MODELS: Record<HardwareTier, ModelConfig> = {
  lightweight: {
    id: 'Snowflake/snowflake-arctic-embed-xs',
    tier: 'lightweight',
    dims: 384,
    description: 'Ultra-fast 2026 lightweight SOTA, low memory'
  },
  balanced: {
    id: 'nomic-ai/nomic-embed-text-v1.5',
    tier: 'balanced',
    dims: 768,
    description: 'Matryoshka-capable, high precision RAG'
  },
  performance: {
    id: 'Xenova/bge-m3',
    tier: 'performance',
    dims: 1024,
    description: 'SOTA 2026, 8k context, hybrid search support'
  }
};

export class EmbeddingService {
  private pipeline: any;
  private initialized = false;
  private config!: ModelConfig;

  /**
   * Automatically detect hardware tier based on system resources
   */
  private detectHardwareTier(): HardwareTier {
    const totalMemGB = os.totalmem() / (1024 * 1024 * 1024);
    const cpuCores = os.cpus().length;

    console.error(`Detected System: ${totalMemGB.toFixed(1)}GB RAM, ${cpuCores} CPU Cores`);

    if (totalMemGB >= 16 && cpuCores >= 8) {
      return 'performance';
    } else if (totalMemGB >= 8 || cpuCores >= 4) {
      return 'balanced';
    }
    return 'lightweight';
  }

  async init() {
    if (this.initialized) return;

    const tier = (process.env.MEMORY_HARDWARE_TIER as HardwareTier) || this.detectHardwareTier();
    this.config = MODELS[tier];

    console.error(`Initializing Hardware Tier: ${tier.toUpperCase()}`);
    console.error(`Loading Model: ${this.config.id} (${this.config.description})`);

    // In a Node.js environment, we use FP32 by default, 
    // but we can request quantized versions for memory efficiency
    const dtype = tier === 'performance' ? 'fp32' : 'q8';

    try {
      this.pipeline = await pipeline('feature-extraction', this.config.id, {
        dtype: dtype,
      });
      this.initialized = true;
      console.error('Embedding pipeline initialized successfully.');
    } catch (error) {
      console.error(`Failed to load ${tier} model, falling back to lightweight tier...`, error);
      this.config = MODELS.lightweight;
      this.pipeline = await pipeline('feature-extraction', this.config.id);
      this.initialized = true;
    }
  }

  async embed(text: string, isQuery = false): Promise<number[]> {
    await this.init();
    
    let processedText = text;
    // Arctic models recommend a prefix for queries to optimize retrieval
    if (isQuery && this.config.id.includes('snowflake-arctic')) {
      processedText = `Represent this sentence for searching relevant passages: ${text}`;
    }

    const options: any = { 
      pooling: this.config.id.includes('snowflake-arctic') ? 'cls' : 'mean', 
      normalize: true 
    };
    
    const output = await this.pipeline(processedText, options);
    return Array.from(output.data);
  }

  getConfig() {
    return this.config;
  }
}

export const embeddingService = new EmbeddingService();
