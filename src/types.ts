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

export type AnalysisType = 'descritiva' | 'preditiva' | 'anomalias' | 'otimizacao' | 'software';

export interface AnalysisResult {
  analysis_type: AnalysisType;
  input_rows: number;
  input_columns: string[];
  analysis_result: Record<string, unknown>;
}

export interface Message {
  id: number;
  channel: string;
  sender: string;
  text: string;
  analysis?: AnalysisResult;
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
