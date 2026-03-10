import { Request, Response } from 'express';
import { Octokit } from '@octokit/rest';

// O Octokit lerá o token do seu .env
const octokit = new Octokit({ auth: process.env.VITE_GITHUB_TOKEN || '' });

export const availableTools = [
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

export const handleToolExecution = async (req: Request, res: Response) => {
  const { toolName, args } = req.body;

  if (!toolName || !args) {
    return res.status(400).json({ error: 'toolName e args são obrigatórios.' });
  }

  console.log(`[Tool Executor Backend] Ferramenta: ${toolName}`, args);

  try {
    if (toolName === 'github_list_repos') {
      const response = await octokit.rest.repos.listForUser({
        username: args.username,
        per_page: 5,
        sort: 'updated'
      });
      const repos = response.data.map((repo: any) => repo.name).join(', ');
      return res.json({ result: `Últimos 5 repositórios públicos de ${args.username}: [${repos || 'Nenhum'}]` });
    }

    if (toolName === 'github_create_issue') {
      const response = await octokit.rest.issues.create({
        owner: args.owner,
        repo: args.repo,
        title: args.title,
        body: args.body
      });
      return res.json({ result: `Issue "${args.title}" criada com sucesso em ${args.owner}/${args.repo}! Link: ${response.data.html_url}` });
    }

    return res.status(404).json({ error: 'Ferramenta não encontrada ou não habilitada no backend.' });
  } catch (error: any) {
    console.error(`Erro ao executar ferramenta ${toolName}:`, error);
    return res.status(500).json({ error: error.message });
  }
};
