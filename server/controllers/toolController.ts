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
  },
  {
    name: 'get_current_time',
    description: 'Retorna a data e hora atual do sistema local. Parâmetros: {}',
    parameters: {}
  },
  {
    name: 'calculate_math',
    description: 'Calcula uma expressão matemática simples. Parâmetros: { "expression": "string" }',
    parameters: { expression: 'string' }
  },
  {
    name: 'store_memory',
    description: 'Salva uma string curta em memória volátil associada a uma chave. Parâmetros: { "key": "string", "value": "string" }',
    parameters: { key: 'string', value: 'string' }
  },
  {
    name: 'retrieve_memory',
    description: 'Busca o valor salvo na memória volátil pela chave. Parâmetros: { "key": "string" }',
    parameters: { key: 'string' }
  }
];

// Dicionário simples em memória RAM (volátil com o servidor backend)
const memoryStore: Record<string, string> = {};

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

    if (toolName === 'get_current_time') {
      const now = new Date();
      return res.json({ result: `A data e hora atual no servidor longo é: ${now.toLocaleString('pt-BR')}` });
    }

    if (toolName === 'calculate_math') {
       try {
         // Evaluador super simples (Note que \`eval\` é perigoso em prodção, mas aceitável para um pequeno hub local)
         // Substitui caracteres não matemáticos puramente por segurança adicional.
         const expression = String(args.expression).replace(/[^0-9+\-*/().]/g, '');
         const result = Function(`"use strict"; return (${expression})`)();
         return res.json({ result: `O resultado de ${args.expression} é ${result}` });
       } catch(e) {
         return res.json({ result: `Expressão matemática inválida: ${args.expression}` });
       }
    }

    if (toolName === 'store_memory') {
       memoryStore[args.key] = args.value;
       return res.json({ result: `Valor salvo com sucesso na chave '${args.key}'.` });
    }

    if (toolName === 'retrieve_memory') {
       const val = memoryStore[args.key];
       if (val) {
         return res.json({ result: `Memória na chave '${args.key}': ${val}` });
       }
       return res.json({ result: `Não encontrei nada salvo com a chave '${args.key}'.` });
    }

    return res.status(404).json({ error: 'Ferramenta não encontrada ou não habilitada no backend.' });
  } catch (error: any) {
    console.error(`Erro ao executar ferramenta ${toolName}:`, error);
    return res.status(500).json({ error: error.message });
  }
};
