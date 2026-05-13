export type MemoryType = 'context' | 'finding' | 'plan' | 'summary';

export interface MemoryPayload {
  id: string; // UUID
  type: MemoryType;
  content: string; // The raw text stored
  timestamp: string; // ISO 8601
  tags?: string[]; // Optional metadata for filtering
}
