# Arquitetura

## 1. Visão geral

```
┌──────────── UI (React + shadcn/ui + Tailwind) ─────────────┐
│ features/* ── usam hooks de queries/* e realtime/*         │
└──────────────┬───────────────────────────┬─────────────────┘
               │ TanStack Query            │ eventos aplicados no cache
┌──────────────▼──────────┐     ┌──────────▼──────────────────┐
│ api/endpoints (Axios)   │     │ realtime (socket.io-client) │
└──────────────┬──────────┘     └──────────┬──────────────────┘
               │ HTTP /api/*                │ WebSocket (Engine.IO v4 / Socket.IO v5)
┌──────────────▼────────────────────────────▼─────────────────┐
│ MSW (service worker + interceptor WebSocket) ── mocks/*     │
│ handlers REST · servidor Socket.IO · db persistido · cenários│
└─────────────────────────────────────────────────────────────┘
```

- **Contratos únicos**: `src/api/contracts.ts` (tipos) e `src/api/schemas.ts` (zod) são usados pelos componentes, pelos hooks, pelo Axios e pelos handlers MSW.
- **Nenhuma resposta fictícia fora de `/mocks`**: componentes, hooks e o cliente Axios não conhecem os mocks. A app só fala com a API por HTTP e com o tempo real por WebSocket.
- **Boot**: `main.tsx` inicia o MSW **antes** de importar a aplicação. O `engine.io-client` guarda a referência do construtor `WebSocket` quando o módulo é carregado, e o MSW só o substitui no `worker.start()`. Por isso, a ordem garante a interceptação.

## 2. Contratos REST

Base `/api`. Erros sempre no formato:

```json
{ "error": { "code": "QUOTE_OUTDATED", "message": "…", "fields": { "campo": "mensagem" }, "details": { } } }
```

| Status | Códigos |
| --- | --- |
| 400 | `VALIDATION_ERROR` (corpo/cabeçalho inválido) |
| 401 | `INVALID_CREDENTIALS`, `SESSION_INVALID`, `SESSION_EXPIRED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `EMAIL_TAKEN`, `USERNAME_TAKEN`, `OUT_OF_STOCK`, `QUANTITY_LIMIT`, `EDITION_UNAVAILABLE`, `QUOTE_OUTDATED`, `IDEMPOTENCY_CONFLICT`, `WALLET_REJECTED`, `WALLET_NOT_CONNECTED`, `ADDRESS_IN_USE` |
| 422 | `VALIDATION_ERROR` (com `fields`), `COUPON_INVALID`, `COUPON_EXPIRED`, `WRONG_PASSWORD`, `CART_EMPTY` |
| 500/503 | `INTERNAL`, `TRANSIENT` (falha transitória, repetível) |

| Recurso | Método e rota | Corpo / parâmetros | Resposta |
| --- | --- | --- | --- |
| Cadastro | `POST /auth/register` | `{ username, email, password }` | `201 Session` · 409 conflito · 422 |
| Login | `POST /auth/login` | `{ email, password }` | `Session` · 401 |
| Sessão | `GET /auth/session` | Bearer | `Session` · 401 expirada/inválida |
| Logout | `POST /auth/logout` | Bearer | `204` |
| NFTs | `GET /nfts` | `q, category, network, minPrice, maxPrice, sort, tab, page, pageSize` | `NftListResponse` (itens, paginação, facetas) |
| Detalhe | `GET /nfts/:id` | — | `NftDetail` · 404 |
| Favoritos | `GET /favorites` · `PUT/DELETE /favorites/:nftId` | Bearer | `{ nftIds }` |
| Carrinho | `GET /cart` | Bearer **ou** `X-Cart-Id` (visitante) | `Cart` |
| | `POST /cart/items` | `{ nftId, editionId, quantity }` | `201 Cart` · 409 limite/esgotado |
| | `PATCH /cart/items/:id` | `{ quantity }` | `Cart` · 409 limite |
| | `DELETE /cart/items/:id` | — | `Cart` |
| | `PUT /cart/coupon` · `DELETE /cart/coupon` | `{ code }` | `Cart` · 422 inválido/expirado |
| | `POST /cart/merge` | `{ guestCartId }` (Bearer) | `Cart` do usuário |
| Cotação | `GET /quote?network=` | — | `Quote` (linhas, subtotal, desconto, taxa, total, `issues`, `hash`) |
| Pedidos | `POST /orders` | `Idempotency-Key` + `{ quoteHash, network, walletId, walletSessionId, collector }` | `201 Order` · `200` replay · 409 |
| | `GET /orders/:id` · `GET /orders?status=` | Bearer | `Order` · 403 · 404 |
| Perfil | `GET/PATCH /profile` | `{ displayName, username, email, bio }` | `User` · 409 · 422 |
| | `PUT/DELETE /profile/avatar` | `{ dataUrl }` (≤ 1 MB, PNG/JPG/WEBP/GIF) | `User` |
| | `PUT /profile/password` | `{ currentPassword, newPassword }` | `204` · 422 `WRONG_PASSWORD` |
| Carteiras | `GET /wallets` · `PUT /wallets/:slot` (`primary`/`secondary`) | `{ label, address, network, type, ens }` | `Wallet` · 409 `ADDRESS_IN_USE` · 422 |
| Conexão de carteira | `POST /wallet-sessions` · `DELETE /wallet-sessions/:id` | `{ walletId, provider, network }` | `WalletSession` · 409 `WALLET_REJECTED` |

**Valores monetários:** todo valor em ETH trafega como string decimal (`"26.846"`) e é calculado com `big.js` (`src/lib/money.ts`), tanto no cliente quanto no mock. Quantidades são inteiras e validadas. Subtotal, desconto, taxa e total exibidos vêm **sempre** da cotação da API. O cliente não recalcula totais.

**Idempotência (`POST /orders`):** a API guarda `usuário + chave → (hash do corpo, pedido)`. A mesma chave com o mesmo corpo devolve o mesmo pedido (`200`, cabeçalho `Idempotent-Replayed`). A mesma chave com outro corpo responde `409 IDEMPOTENCY_CONFLICT`. O cliente gera a chave a partir de uma "impressão digital" do corpo (`stableHash`) e a guarda em `sessionStorage`. Retries automáticos, cliques repetidos e refresh reutilizam a mesma chave.

**Revalidação antes de confirmar:** o pedido carrega o `quoteHash` aceito pelo usuário. A API recalcula a cotação. Se o hash mudou (preço, cupom, taxa, disponibilidade), responde `409 QUOTE_OUTDATED` ou `OUT_OF_STOCK` com a cotação atual em `details.quote`. A UI exige nova confirmação.

## 3. Eventos (Socket.IO)

Envelope comum (`RealtimeEvent`):

```ts
{ eventId: "evt_000123",            // identidade estável (reenvio = mesmo id)
  type: "nft.updated" | "order.updated",
  resource: { type: "nft" | "order", id: "emerald-ape-042" },
  version: 7,                        // versão do recurso após a mudança (monotônica)
  occurredAt: "2026-11-24T…Z",
  data: { … } }
```

| Evento | `data` | Destino | Efeito no cliente |
| --- | --- | --- | --- |
| `nft.updated` | `nftId, name, price, previousPrice, soldOut, editions[{id,label,price,available}]` | todos | Atualiza detalhe e listas (se `version` > a versão em cache), revalida carrinho e cotação, mostra aviso se o NFT está no carrinho |
| `order.updated` | `orderId, userId, status, txHash, failureReason` | só o dono | Atualiza o pedido, revalida o carrinho (itens comprados saem) e exibe confirmação ou recusa |

- **Duplicatas e eventos antigos:** `EventGuard` (`src/realtime/eventGuard.ts`) descarta `eventId` já visto e versão menor ou igual à última aplicada por recurso. Além disso, `applyNftUpdated` ignora o evento se o cache REST já tiver versão igual ou maior.
- **Isolamento por sessão:** o token vai na query do handshake. O servidor só envia `order.updated` para conexões do dono, e o cliente ainda confere `data.userId`. Trocar de usuário destrói o socket, remove listeners e descarta o `EventGuard`.
- **Reconexão:** `socket.io-client` reconecta com backoff (0,5–3 s). No `connect` seguinte a uma queda, o cliente revalida via REST todas as consultas ativas de `nfts`, `cart` e `private` (reconciliação). O servidor também resolve pedidos vencidos ao receber uma conexão.
- **Pedidos terminais:** `confirmed` e `rejected` não mudam mais. A versão impede regressão para `pending`.

### Transporte no ambiente de mocks e limitações

O servidor simulado (`mocks/realtime/server.ts`) usa a API `ws.link()` do MSW e implementa o protocolo real **Engine.IO v4 / Socket.IO v5** (handshake `0{…}`, CONNECT `40`, EVENT `42[…]`, heartbeat `2`/`3`). Ele cumpre o papel do `@mswjs/socket.io-binding` sem depender de um pacote experimental e mantém controle total do handshake para os cenários de queda.

Limitações:
- só o transporte **websocket** (o cliente usa `transports: ['websocket']`). O MSW não intercepta o long-polling do Engine.IO;
- só o namespace `/`, sem ACKs e sem pacotes binários;
- o "servidor" vive na própria aba: eventos não cruzam abas nem dispositivos;
- o estado do servidor é persistido no `localStorage`. Timers de pedidos pendentes são reagendados no boot e resolvidos sob demanda (GET ou nova conexão).

## 4. Política de sessão

- `POST /auth/login|register` devolve `{ token, expiresAt, user }`. O token opaco e a expiração ficam no `localStorage` (`kurio:session`) para a sessão sobreviver a refresh. Nenhuma senha é armazenada no cliente.
- No boot, `GET /auth/session` revalida a sessão. Um timer local expira a sessão no `expiresAt`.
- Qualquer `401 SESSION_EXPIRED/INVALID` em chamada autenticada expira a sessão (interceptor do Axios).
- Na expiração: o cache privado é limpo e, se a rota for privada (checkout, conta, pedidos, carrinho), o usuário vai para `/login?redirect=<rota>&reason=expired`. O rascunho do checkout fica em `sessionStorage` e é restaurado ao voltar.
- Logout e troca de usuário: `queryClient` remove tudo em `['private', …]` e `['cart', …]`, cancela consultas em voo, limpa mutations, troca o socket e gera novo id de visitante.
- Rotas privadas (`/checkout`, `/orders/*`, `/account/*`, `/explorer/*`) são protegidas no `beforeLoad` do TanStack Router.

## 5. Estado do carrinho

- O carrinho vive **na API**. Visitantes são identificados por `X-Cart-Id` (UUID no `localStorage`) e usuários pelo token.
- No login/cadastro, `POST /cart/merge` incorpora o carrinho do visitante ao do usuário, respeitando os limites de disponibilidade, e o id de visitante é renovado.
- Limites: quantidade ≤ `min(disponível, 10)` por edição, validado na API (`409 QUANTITY_LIMIT`). A UI desabilita os botões no limite.
- Totais: sempre da `GET /quote`. Problemas (esgotado, quantidade reduzida, cupom expirado) chegam em `quote.issues` e bloqueiam o checkout.
- Após a confirmação, a API remove do carrinho **apenas** as quantidades compradas. Em falhas, nada é removido.

## 6. Estratégia de cache (TanStack Query)

| Dado | Chave | staleTime | Observações |
| --- | --- | --- | --- |
| Catálogo | `['nfts','list', params]` | 30 s | `keepPreviousData` mostra "atualizando" em segundo plano. O `AbortSignal` cancela a consulta anterior |
| Detalhe | `['nfts','detail', id]` | 30 s | 404 não é repetido |
| Carrinho | `['cart', owner, 'data']` | 10 s | Mutations gravam a resposta (`setQueryData`) e invalidam a cotação |
| Cotação | `['cart', owner, 'quote', network]` | 5 s | Invalidada por mutations do carrinho, `nft.updated` e `409` |
| Favoritos | `['private', userId, 'favorites']` | 30 s | **Atualização otimista com rollback** |
| Perfil/Carteiras | `['private', userId, …]` | 30 s | Mutations atualizam o cache e o `authStore` |
| Pedido | `['private', userId, 'order', id]` | 30 s | `order.updated` + revalidação a cada 10 s enquanto pendente (rede de segurança) |

- **Retries:** só para erros transitórios (`NETWORK_ERROR`, `TIMEOUT`, 5xx), até 2 vezes, com backoff de 1 s e 2 s. 4xx nunca é repetido. As mutations não repetem, exceto `POST /orders`, que é idempotente.
- **Isolamento:** o usuário e os parâmetros fazem parte das chaves. Logout remove os namespaces privados.
- **Respostas fora de ordem:** cada combinação de filtros tem sua própria chave, e a UI só lê a chave atual. Respostas atrasadas de outra chave nunca sobrescrevem a tela (cenário `out-of-order`).

## 7. Interface, responsividade e acessibilidade

- Tokens do Figma em `src/styles/index.css` (`@theme` do Tailwind 4), com nomes no padrão shadcn. Os componentes `ui/` (Button, Dialog, Sheet, Label, Field…) seguem o shadcn/ui com Radix e foram restilizados.
- Layout verificado em 320, 390, 768, 1024 e 1440 px, sem rolagem horizontal (320 px equivale a zoom de 400% numa tela de 1280 px). No mobile, os filtros ficam num drawer, a navegação vai para a barra inferior e a compra fica numa barra fixa.
- Skeletons com shimmer e dimensões reservadas (catálogo, detalhe, resumo do carrinho, checkout, perfil). `prefers-reduced-motion` desliga shimmer e animações.
- Teclado: link "Pular para o conteúdo", foco visível global, abas com setas, Dialog/Sheet do Radix com focus trap, Esc e retorno do foco.
- Formulários: `Field` associa label, dica e erro (`aria-describedby`, `aria-invalid`, `role="alert"`). Erros da API são mapeados para os campos.
- Feedback de mutations e de tempo real: toasts (`sonner`, região `aria-live`), avisos `role="status"` no carrinho/checkout e indicador de conexão com texto (não só cor).
- Estados não dependem só de cor: edição esgotada é riscada e tem texto, filtro ativo tem marcador e `aria-pressed`, e a conexão usa forma e texto.

## 8. Fidelidade ao Figma, desvios e substituições

**Grade e escala (medidas a partir dos frames de 1440 px):** conteúdo com 1200 px de largura (margens de 120 px), hero com imagem de 450 px e título de 44 px, barra de filtros de 309 px, catálogo em 3 colunas e galeria do detalhe com miniaturas de 96 px. Abaixo de 1024 px, carrinho e pagamento passam para uma coluna. No mobile, o catálogo usa 2 colunas com a segunda deslocada, como no frame.

**Correções de inconsistências do layout:** o Figma tinha pequenas diferenças entre elementos que deveriam ser iguais (por exemplo, a imagem de um card do catálogo desalinhada em relação aos vizinhos, e espaçamentos diferentes entre colunas). A implementação usa um único componente por tipo de elemento, com o mesmo espaçamento e as mesmas proporções em todo o site.

**Desvios intencionais:**
- **Imagens:** as artes foram recortadas dos frames do Figma e reamostradas para 900×900 WebP (`public/images/`), para nitidez em telas de alta densidade e no hero de 450 px. Para máxima fidelidade, basta exportar os originais do Figma com os mesmos nomes.
- **Fonte:** Roboto Mono (variável, auto-hospedada via `@fontsource-variable`), a monoespaçada que mais se aproxima do layout.
- **Cabeçalho no mobile:** o Figma mobile não tem cabeçalho; a navegação fica na barra inferior (Início, Favoritos, Carrinho, Perfil/Entrar). Cada tela mobile tem a própria barra superior (voltar + título), como nos frames.
- **Login e cadastro:** seguem o Figma (placeholders, abas "Entrar | Criar conta", borda inferior cobre). Para acessibilidade, cada campo tem um `<label>` visível apenas para leitores de tela.
- **Busca no desktop:** além do ícone do cabeçalho, há um campo "Explorar coleções" no topo da barra de filtros (no Figma, só no mobile). Assim a busca fica visível e operável por teclado.
- **Pagamento:** os dados da carteira vêm das carteiras cadastradas (seleção Principal/Reserva, como no frame mobile) e aparecem somente leitura. "Código de indicação" é opcional. O cupom abre pelo link "Tem um código promocional? Aplique aqui", como no frame.
- **Conexão de carteira:** botão explícito "Conectar carteira" (simulação de conexão, recusa e desconexão), que não existe no frame.
- **Revisão do pedido:** modal de revisão antes do envio (exigência do enunciado; sem frame).
- **Carteiras:** o formulário usa só os campos que a API de carteiras precisa (nome, rede, tipo, endereço, ENS). Os campos do frame que repetem dados do perfil ficam na tela de perfil.
- **Estados não desenhados** (pendente, recusado, 404, vazio, erro, explorador simulado, "em breve") seguem a mesma linguagem visual.
- **Links fora do escopo** (Criadores, Aprenda, Diário, Ajuda, redes sociais, newsletter, login social, recuperar senha) levam a "Em breve" ou mostram aviso de indisponibilidade. Nada aparenta sucesso.
- **Painel "Cenários":** ferramenta da demonstração (botão no canto inferior esquerdo no desktop e aba lateral no mobile). Ele altera apenas o servidor simulado.

## 9. Performance

- Código dividido por rota (`lazyRouteComponent`) e chunks separados para React e TanStack.
- Imagem do hero com `preload` + `fetchpriority="high"`. As demais usam `loading="lazy"`, dimensões explícitas e WebP.
- Fonte auto-hospedada (sem requisição externa).
- **Custo conhecido:** a auditoria roda o build de demonstração **com MSW**, como pede o enunciado. Registrar o service worker e carregar o chunk de mocks antes do primeiro render adicionam algumas centenas de ms ao LCP no perfil mobile (CPU 4x). Se a Performance mobile ficar abaixo de 90, a causa principal é essa etapa. Os relatórios ficam em `reports/lighthouse/` e a mediana em `summary.md`.

## 10. Limitações conhecidas

- Não há backend real: o "servidor" roda na aba do navegador. Abrir duas abas cria dois servidores independentes que compartilham o mesmo `localStorage`.
- Pagamentos, blockchain, extensões de carteira e explorador de blocos são simulados.
- O carrossel do hero não troca sozinho (decisão de acessibilidade).
