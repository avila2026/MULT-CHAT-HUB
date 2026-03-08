import { Tool } from '../types';

export const availableTools: Tool[] = [
  {
    name: 'github_list_repos',
    description: 'Lista os repositórios do GitHub de um usuário. Parâmetros: { "username": "string" }',
    parameters: { username: 'string' }
  },
  {
    name: 'github_create_issue',
    description: 'Cria uma issue em um repositório. Parâmetros: { "owner": "string", "repo": "string", "title": "string", "body": "string" }',
    parameters: { owner: 'string', repo: 'string', title: 'string', body: 'string' }
  }
];

export const executeTool = async (toolName: string, args: any) => {
  console.log(`Executando ferramenta ${toolName} com argumentos:`, args);
  
  // Simulação de integração real
  if (toolName === 'github_list_repos') {
    return `Repositórios de ${args.username}: [multi-ai-hub, agent-framework, tool-integration]`;
  }
  
  if (toolName === 'github_create_issue') {
    return `Issue "${args.title}" criada com sucesso em ${args.owner}/${args.repo}!`;
  }
  
  return 'Ferramenta não encontrada.';
};
