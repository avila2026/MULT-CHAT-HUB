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

export interface Message {
  id: number;
  channel: string;
  sender: string;
  text: string;
}

export interface Channel {
  name: string;
  members: string[];
  isPrivate: boolean;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: string;
}
