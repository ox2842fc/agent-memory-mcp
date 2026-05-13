export type MemoryType = 'context' | 'finding' | 'plan' | 'summary';

export interface MemoryPayload {
  id: string; // UUID
  type: MemoryType;
  content: string; // The raw text stored
  timestamp: string; // ISO 8601
  tags?: string[]; // Optional metadata for filtering
  artifact_path?: string; // Optional path to related artifact
  artifact_kind?: string; // Optional kind of artifact (e.g. 'code', 'build', 'log')
}
