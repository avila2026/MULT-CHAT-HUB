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
import { GoogleGenAI } from '@google/genai';
var GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
var GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
var OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
var OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
var SYSTEM_INSTRUCTION = "Você é o Multi-AI Collaboration Hub, um sistema que orquestra múltiplas IAs. Você simula uma equipe colaborativa com agentes especializados. Responda como um agente, mantendo o estado. Detecte comandos prefixados com '/' (ex: /criar_tarefa, /concluir_tarefa, /remover_tarefa, /limpar_dados, /analisar_dados, /gerar_relatorio) nos seus outputs e execute-os logicamente. Exemplo de uso de ID numérico: /concluir_tarefa \"1\". Você também pode usar ferramentas externas via comando '/use_tool [nome] [args_json]'. As ferramentas ativas incluem: get_current_time (sem args), calculate_math (expressao matemática na string 'expression'), store_memory/retrieve_memory (com 'key' e 'value'), etc.";
var gemini = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;
function chatViaGemini(input, thinking, model) {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, gemini.models.generateContent({
                        model: model,
                        contents: input,
                        config: {
                            systemInstruction: SYSTEM_INSTRUCTION,
                            thinkingConfig: { thinkingBudget: thinking === 'HIGH' ? 2048 : 512 }
                        }
                    })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.text || 'Sem resposta do modelo.'];
            }
        });
    });
}
function chatViaOllama(input, thinking, model) {
    return __awaiter(this, void 0, void 0, function () {
        var numPredict, r, text, data;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    numPredict = thinking === 'HIGH' ? 2048 : 512;
                    return [4 /*yield*/, fetch("".concat(OLLAMA_HOST, "/api/chat"), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                model: model,
                                messages: [
                                    { role: 'system', content: SYSTEM_INSTRUCTION },
                                    { role: 'user', content: input }
                                ],
                                stream: false,
                                options: { num_predict: numPredict }
                            })
                        })];
                case 1:
                    r = _b.sent();
                    if (!!r.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, r.text()];
                case 2:
                    text = _b.sent();
                    throw new Error("Ollama respondeu ".concat(r.status, ": ").concat(text));
                case 3: return [4 /*yield*/, r.json()];
                case 4:
                    data = _b.sent();
                    return [2 /*return*/, ((_a = data === null || data === void 0 ? void 0 : data.message) === null || _a === void 0 ? void 0 : _a.content) || 'Sem resposta do modelo.'];
            }
        });
    });
}
export var handleChat = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, input, model, _b, thinking, text, err_1, text, err_2, error_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 8, , 9]);
                _a = req.body, input = _a.input, model = _a.model, _b = _a.thinking, thinking = _b === void 0 ? 'HIGH' : _b;
                if (!input) {
                    return [2 /*return*/, res.status(400).json({ error: 'Input form is required' })];
                }
                if (!gemini) return [3 /*break*/, 4];
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, chatViaGemini(input, thinking, model || GEMINI_MODEL)];
            case 2:
                text = _c.sent();
                return [2 /*return*/, res.json({ text: text, provider: 'gemini' })];
            case 3:
                err_1 = _c.sent();
                console.error('[Gemini falhou, tentando Ollama como fallback]', err_1.message);
                return [3 /*break*/, 4];
            case 4:
                _c.trys.push([4, 6, , 7]);
                return [4 /*yield*/, chatViaOllama(input, thinking, model || OLLAMA_MODEL)];
            case 5:
                text = _c.sent();
                return [2 /*return*/, res.json({ text: text, provider: 'ollama' })];
            case 6:
                err_2 = _c.sent();
                return [2 /*return*/, res.status(503).json({
                        error: "Nenhum provedor de LLM dispon\u00EDvel. ".concat(gemini ? 'Gemini falhou e ' : 'GEMINI_API_KEY não configurada. ', "Ollama n\u00E3o acess\u00EDvel em ").concat(OLLAMA_HOST, " (").concat(err_2.message, "). Configure GEMINI_API_KEY no .env.local ou rode 'ollama serve' + 'ollama pull ").concat(OLLAMA_MODEL, "'.")
                    })];
            case 7: return [3 /*break*/, 9];
            case 8:
                error_1 = _c.sent();
                console.error('Error generic chat handler:', error_1);
                return [2 /*return*/, res.status(500).json({ error: error_1.message || 'Internal Server Error' })];
            case 9: return [2 /*return*/];
        }
    });
}); };
