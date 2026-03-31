export type EntityType = 'person' | 'company' | 'pac' | 'wallet' | 'shell_company' | 'nonprofit';
export type RelationshipType = 'OWNS' | 'DONATED_TO' | 'TRANSACTED_WITH' | 'CONTROLS' | 'LOBBIED' | 'MEMBER_OF';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  metadata: Record<string, any>;
  sources: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: string;
  fromId: string;
  toId: string;
  type: RelationshipType;
  amount?: number;
  currency?: string;
  date?: string;
  source: string;
  metadata: Record<string, any>;
}

export interface GraphNode extends Entity {
  connections: number;
  riskScore?: number;
}

export interface GraphEdge extends Relationship {}

export interface SearchResult {
  entities: GraphNode[];
  totalCount: number;
}

export interface MoneyFlow {
  path: GraphNode[];
  totalAmount: number;
  currency: string;
}
