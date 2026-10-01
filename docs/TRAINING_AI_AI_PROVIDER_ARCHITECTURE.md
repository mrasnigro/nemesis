# Treinamento IA — Arquitetura de AI Provider (futuro)

**Data:** 5 agosto 2026  
**Status:** Abstração pronta · **nenhuma API externa integrada**  
**Módulo:** `src/modules/training-ai/`

---

## 1. Objetivo

Preparar o Treinamento IA para plugar um provedor de IA (LLM texto, e depois voz) **sem reescrever**:

- `TrainingAiContext`
- modelo de Sessão
- Relatórios
- motor de Scoring / rubrica

Hoje o produto continua 100% **mock** (regras + scripts). A camada `services/ai/` isola a geração de respostas da persona.

---

## 2. Separação de responsabilidades

| Camada | Responsabilidade | Não faz |
|--------|------------------|---------|
| **UI / pages** | Catálogo, simulação, formulários | Chamar SDK LLM |
| **TrainingAiContext** | Sessão, fases, history, CRUD domínio | Conhecer OpenAI/Anthropic/etc. |
| **Conversation engine** (`services/ai/`) | Orquestrar turno → provider → mensagem | Avaliar rubrica |
| **AI Provider** | Gerar texto da persona | Persistir sessão / score |
| **Response adapter** | Normalizar payload → mensagem `{id,role,speaker,text,timestamp}` | Prompting de domínio |
| **Scoring** (`services/scoring.js` + passRules) | Rubrica a partir das falas do trainee | Gerar diálogo |
| **Conversation helpers** (`services/conversation.js`) | Shape de mensagem + scoring free-text | Provider concreto |

```text
Trainee envia texto
        │
        ▼
TrainingAiContext.sendMessage
        │
        ▼
getConversationEngine()
        │
        ├── createUserMessage(text)
        └── generateReplyMessage(request)
                │
                ▼
         AiProvider.generatePersonaReply(request)
                │
                ▼
         responseAdapter → mensagem AI
                │
                ▼
         messages[] na sessão
                │
                ▼ (Encerrar)
         buildSessionEvaluation (rubrica) → Report / History
```

---

## 3. Contrato do provider

Arquivo: `services/ai/provider.js`

```js
AiProvider {
  id: string
  label?: string
  generatePersonaReply(request: AiPersonaReplyRequest)
    => AiProviderResponse | Promise<AiProviderResponse>
}

AiPersonaReplyRequest {
  persona, scenario, template?,
  scriptTurns?, messages?,
  exchangeIndex, userText, session?
}

AiProviderResponse {
  text: string
  provider: string
  finishReason?: string
  meta?: object
}
```

Regras:

1. O provider **só** devolve texto (e metadados opcionais).  
2. O adapter garante o shape consumido por UI e relatório.  
3. Scoring continua independente: olha `messages` do trainee + template, não o provider.

---

## 4. Implementação atual (mock)

| Arquivo | Papel |
|---------|-------|
| `services/ai/mockProvider.js` | `createMockAiProvider()` + `generateMockReply()` (regras / scripts) |
| `services/ai/responseAdapter.js` | Abertura, user, AI, payload de provider → mensagem |
| `services/ai/conversationEngine.js` | Engine + `getConversationEngine()` / `configureConversationProvider()` |
| `services/ai/index.js` | Surface pública |

`TrainingAiContext` usa apenas o engine:

- `createOpeningMessage`
- `createUserMessage`
- `generateReplyMessage` (sync — mock)

Compat: `services/conversation.js` reexporta `generateMockReply` para smokes legados.

---

## 5. Como trocar o provider no futuro (sem mudar Context)

```js
import {
  configureConversationProvider,
  assertAiProvider,
} from '../services/ai'

const llmProvider = {
  id: 'openai', // exemplo — NÃO implementado
  async generatePersonaReply(request) {
    // montar system prompt com persona + scenario + template
    // chamar API
    return { text: '...', provider: 'openai', finishReason: 'stop' }
  },
}

assertAiProvider(llmProvider)
configureConversationProvider(llmProvider)
```

Quando o provider for **async**:

1. Preferir `engine.generateReplyMessageAsync(request)`.  
2. Evoluir `sendMessage` para `async` / pending state na UI.  
3. Manter o adapter e o shape de sessão iguais.

Feature flag sugerida (futuro): `VITE_TRAINING_AI_PROVIDER=mock|openai|…`.

---

## 6. Mapa de prompts / juízes (fase LLM)

| Uso | Input | Output |
|-----|-------|--------|
| **Persona reply** | persona + scenario + transcript | fala do cliente |
| **Judge (opcional)** | template criteria + transcript | pass/fail por critério |

No MVP atual o “judge” é **keyword / passRule** no scoring — não passa pelo AI provider.  
Evolução natural: um `AiJudgeProvider` separado, para não misturar roleplay e avaliação.

---

## 7. O que permanece fora do provider

- CRUD Persona / Cenário / Template  
- Briefing e histórico  
- Relatório (score, seções ✓/✗, Ver conversa)  
- Permissões `training.*`  
- Identidade visual IMP  

- **Voz / TTS / STT / avatars** — fase posterior (provider de mídia distinto)

---

## 8. Critérios de aceite desta preparação

- [x] Engine separado da geração mock  
- [x] Interface de provider documentada e assertável  
- [x] Adapter único para mensagens de sessão  
- [x] Mock continua sendo o default  
- [x] Context / session / report / scoring sem acoplamento a SDK externo  
- [x] Doc de arquitetura neste arquivo  

---

## 9. Próximos passos sugeridos

1. Provider LLM real atrás da mesma interface (texto).  
2. `sendMessage` async + estado “persona digitando…”.  
3. (Opcional) Judge LLM alinhado ao Evaluation Template.  
4. Só então voz (gravação + STT → mesmo fluxo de mensagens).
