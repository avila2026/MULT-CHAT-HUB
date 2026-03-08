import { Tool } from '../types';
import { Octokit } from '@octokit/rest';

// O Octokit lerá o token do seu .env / Vite para autenticação (se houver)
const octokit = new Octokit({ auth: process.env.VITE_GITHUB_TOKEN || '' });

export const availableTools: Tool[] = [
  {
    name: 'github_list_repos',
    description: 'Lista os repositórios públicos do GitHub de um usuário. Parâmetros: { "username": "string" }',
    parameters: { username: 'string' }
  },
  {
    name: 'github_create_issue',
    description: 'Cria uma issue em um repositório. O token Github deve possuir permissões corretas! Parâmetros: { "owner": "string", "repo": "string", "title": "string", "body": "string" }',
    parameters: { owner: 'string', repo: 'string', title: 'string', body: 'string' }
  }
];

export const executeTool = async (toolName: string, args: any) => {
  console.log(`Executando ferramenta ${toolName} com argumentos:`, args);
  
  if (toolName === 'github_list_repos') {
    try {
      const response = await octokit.rest.repos.listForUser({
        username: args.username,
        per_page: 5,
        sort: 'updated'
      });
      const repos = response.data.map(repo => repo.name).join(', ');
      return `Últimos 5 repositórios públicos de ${args.username}: [${repos || 'Nenhum'}]`;
    } catch (error: any) {
      return `Erro ao buscar repositórios no GitHub: ${error.message}`;
    }
  }
  
  if (toolName === 'github_create_issue') {
    try {
      const response = await octokit.rest.issues.create({
        owner: args.owner,
        repo: args.repo,
        title: args.title,
        body: args.body
      });
      return `Issue "${args.title}" criada com sucesso em ${args.owner}/${args.repo}! Link: ${response.data.html_url}`;
    } catch (error: any) {
       return `Erro ao criar Issue no GitHub: ${error.message}. Você configurou um VITE_GITHUB_TOKEN com permissões necessárias?`;
    }
  }
  
  return 'Ferramenta não encontrada.';
};
