import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { qdrantService } from './src/db/qdrant.js';
import { embeddingService } from './src/embeddings/transformer.js';
import { v4 as uuidv4 } from 'uuid';
import { QdrantClient } from '@qdrant/js-client-rest';

describe("Memory Re-indexing", () => {
  const testId = uuidv4();
  const testContent = "This is a persistent memory that should survive re-indexing.";
  const client = new QdrantClient({ url: process.env.QDRANT_URL || 'http://127.0.0.1:6333' });
  const TEST_COLLECTION = `agent_memory_test_${Date.now()}`;

  beforeAll(async () => {
    process.env.QDRANT_COLLECTION = TEST_COLLECTION;
  });

  afterAll(async () => {
    try {
      await client.deleteCollection(TEST_COLLECTION);
    } catch (e) {}
  });

  test("should automatically re-index when hardware tier changes", async () => {
    console.log('--- Phase 1: Initialize with Lightweight Tier ---');
    process.env.MEMORY_HARDWARE_TIER = 'lightweight';
    
    // Reset singleton state
    (qdrantService as any).client = client;
    (embeddingService as any).initialized = false;
    
    await qdrantService.init();
    
    const vector1 = await embeddingService.embed(testContent);
    await qdrantService.upsert(testId, vector1, {
      id: testId,
      content: testContent,
      type: 'finding',
      timestamp: new Date().toISOString()
    });
    
    expect(vector1.length).toBe(384);

    console.log('--- Phase 2: Switch to Balanced Tier (Trigger Re-index) ---');
    // Ensure separate client for second phase to avoid connection reuse issues in tests
    (qdrantService as any).client = new QdrantClient({ url: process.env.QDRANT_URL || 'http://127.0.0.1:6333' });
    (embeddingService as any).initialized = false;
    
    process.env.MEMORY_HARDWARE_TIER = 'balanced';
    await qdrantService.init(); // This triggers auto-reindex
    
    console.log('--- Phase 3: Verification ---');
    const result = await qdrantService.retrieve(testId);
    expect(result).toBeDefined();
    
    const config = embeddingService.getConfig();
    expect(config.tier).toBe('balanced');
    
    const searchVector = await embeddingService.embed("persistent memory");
    expect(searchVector.length).toBe(768);
    
    const searchResults = await qdrantService.search(searchVector, 1);
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].id).toBe(testId);
  }, 60000); // 60s timeout for model downloads and re-indexing
});
