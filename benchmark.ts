import { embeddingService } from './src/embeddings/transformer.js';
import os from 'os';

async function run() {
  const tier = process.env.MEMORY_HARDWARE_TIER || 'auto';
  console.log(`--- Benchmarking Tier: ${tier} ---`);
  
  const start = Date.now();
  await embeddingService.init();
  const initTime = Date.now() - start;

  const text = "Semantic reasoning over intentions is key for agent memory.";
  
  // Single inference benchmark
  const infStart = Date.now();
  const vector = await embeddingService.embed(text);
  const infTime = Date.now() - infStart;

  console.log(`Model: ${embeddingService.getConfig().id}`);
  console.log(`Init Time: ${initTime}ms`);
  console.log(`Inference Time: ${infTime}ms`);
  console.log(`Dimensions: ${vector.length}`);
}

run().catch(console.error);
