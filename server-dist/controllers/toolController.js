var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { Octokit } from '@octokit/rest';
// O Octokit lerá o token do seu .env
var octokit = new Octokit({ auth: process.env.VITE_GITHUB_TOKEN || '' });
export var availableTools = [
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
var memoryStore = {};
export var handleToolExecution = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, toolName, args, response, repos, response, now, expression, result, val, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, toolName = _a.toolName, args = _a.args;
                if (!toolName || !args) {
                    return [2 /*return*/, res.status(400).json({ error: 'toolName e args são obrigatórios.' })];
                }
                console.log("[Tool Executor Backend] Ferramenta: ".concat(toolName), args);
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                if (!(toolName === 'github_list_repos')) return [3 /*break*/, 3];
                return [4 /*yield*/, octokit.rest.repos.listForUser({
                        username: args.username,
                        per_page: 5,
                        sort: 'updated'
                    })];
            case 2:
                response = _b.sent();
                repos = response.data.map(function (repo) { return repo.name; }).join(', ');
                return [2 /*return*/, res.json({ result: "\u00DAltimos 5 reposit\u00F3rios p\u00FAblicos de ".concat(args.username, ": [").concat(repos || 'Nenhum', "]") })];
            case 3:
                if (!(toolName === 'github_create_issue')) return [3 /*break*/, 5];
                return [4 /*yield*/, octokit.rest.issues.create({
                        owner: args.owner,
                        repo: args.repo,
                        title: args.title,
                        body: args.body
                    })];
            case 4:
                response = _b.sent();
                return [2 /*return*/, res.json({ result: "Issue \"".concat(args.title, "\" criada com sucesso em ").concat(args.owner, "/").concat(args.repo, "! Link: ").concat(response.data.html_url) })];
            case 5:
                if (toolName === 'get_current_time') {
                    now = new Date();
                    return [2 /*return*/, res.json({ result: "A data e hora atual no servidor longo \u00E9: ".concat(now.toLocaleString('pt-BR')) })];
                }
                if (toolName === 'calculate_math') {
                    try {
                        expression = String(args.expression).replace(/[^0-9+\-*/().]/g, '');
                        result = Function("\"use strict\"; return (".concat(expression, ")"))();
                        return [2 /*return*/, res.json({ result: "O resultado de ".concat(args.expression, " \u00E9 ").concat(result) })];
                    }
                    catch (e) {
                        return [2 /*return*/, res.json({ result: "Express\u00E3o matem\u00E1tica inv\u00E1lida: ".concat(args.expression) })];
                    }
                }
                if (toolName === 'store_memory') {
                    memoryStore[args.key] = args.value;
                    return [2 /*return*/, res.json({ result: "Valor salvo com sucesso na chave '".concat(args.key, "'.") })];
                }
                if (toolName === 'retrieve_memory') {
                    val = memoryStore[args.key];
                    if (val) {
                        return [2 /*return*/, res.json({ result: "Mem\u00F3ria na chave '".concat(args.key, "': ").concat(val) })];
                    }
                    return [2 /*return*/, res.json({ result: "N\u00E3o encontrei nada salvo com a chave '".concat(args.key, "'.") })];
                }
                return [2 /*return*/, res.status(404).json({ error: 'Ferramenta não encontrada ou não habilitada no backend.' })];
            case 6:
                error_1 = _b.sent();
                console.error("Erro ao executar ferramenta ".concat(toolName, ":"), error_1);
                return [2 /*return*/, res.status(500).json({ error: error_1.message })];
            case 7: return [2 /*return*/];
        }
    });
}); };
