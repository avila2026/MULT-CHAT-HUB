export interface Tool {
  name: string;
  description: string;
  parameters: any;
}

export interface Agent {
  name: string;
  specialty: string;
  description: string;
  permissions: string[];
  provider: string;
  status: string;
  thinkingLevel: 'LOW' | 'HIGH';
  tools: Tool[];
}
