# GK Orders - Sistema Multi-loja de Gestão de Pedidos e Impressão Automatizada

O GK Orders é uma plataforma SaaS (Software as a Service) de alto desempenho projetada para a gestão operacional completa de restaurantes, lanchonetes e estabelecimentos comerciais do setor de alimentação. O ecossistema integra a frente de caixa (PDV), o controle de salão (mesas e comandas), a operação de delivery próprio e um agente automatizado de impressão térmica segmentada por setores em tempo real.

## Funcionalidades Principais

### 1. Arquitetura Multi-loja (SaaS)
* Isolamento de dados estrito entre diferentes inquilinos (tenants) utilizando Row Level Security (RLS) nativo do PostgreSQL através do identificador `loja_id`.
* Painel unificado adaptável ao volume e particularidades operacionais de cada estabelecimento cadastrado.

### 2. Módulo de Delivery Próprio e Logística
* Painel lateral dedicado para o gerenciamento de fluxo de entregas dividido por etapas (Pendente, Em Preparo, Em Rota, Finalizado).
* Interface de entrada de dados otimizada contendo endereço detalhado, ponto de referência e contato via WhatsApp do cliente.
* Atribuição dinâmica e manual de taxas de entrega na frente de caixa com atualização em tempo real do balanço do pedido.
* Controle de status financeiro explicitando as condições de acerto (Já Pago via canais digitais ou A Cobrar na Entrega, incluindo indicação exata de troco e meio de pagamento escolhido).

### 3. Roteamento Inteligente de Impressão por Setores
* Divisão automática de itens pertencentes a um único pedido em múltiplos trabalhos de impressão com base no cadastro individual de produtos (`setor_impressao`).
* Encapsulamento lógico que permite o direcionamento simultâneo para setores físicos isolados (como cozinha, bar e copa).
* Tratamento específico para hardwares de corte manual (impressoras de serrilha): suporte ao parâmetro unificado `todos`, consolidando o pedido em um cupom único e contínuo para mitigar o desperdício de papel e otimizar o manuseio pelo operador.
* Emissão de documentos dedicados para conferência de expedição logística ("Via do Motoboy"), contendo roteiro de entrega completo e instruções claras de cobrança.

### 4. Agente de Impressão em Segundo Plano (gk-print-agent)
* Microsserviço independente construído em Node.js focado na escuta ativa de eventos via Supabase Realtime.
* Utilização de credenciais de privilégio administrativo (`service_role`) para desvios de RLS estritamente na camada de consumo da fila de impressão (`print_jobs`).
* Integração nativa com o Windows através do utilitário NSSM (Non-Sucking Service Manager), operando de maneira resiliente como um serviço de sistema em segundo plano com políticas automáticas de reinicialização em caso de falhas.

### 5. Sanitização e Consistência de Dados
* Padronização rígida de strings de configuração e inputs de texto por meio de rotinas automatizadas (trimming e conversão para caixa baixa).
* Garantia de integridade operacional eliminando falhas de comunicação causadas por espaçamentos indevidos ou divergência de caracteres nos terminais físicos.

---

## Arquitetura e Tecnologias

### Painel Web (Frontend / PDV)
* **Framework:** React com TypeScript
* **Estilização:** Tailwind CSS
* **Gerenciamento de Estado:** Zustand

### Backend e Infraestrutura de Dados
* **BaaS:** Supabase (PostgreSQL)
* **Comunicação:** Supabase Realtime para sincronização instantânea de pedidos e disparo imediato de impressões
* **Segurança:** Políticas de RLS baseadas em autenticação e escopo de organização

### Agente de Impressão (Desktop Client)
* **Ambiente de Execução:** Node.js
* **Comunicação com Hardware:** Bibliotecas nativas de controle de spooler de impressão do sistema operacional Windows
* **Persistência de Execução:** NSSM para encapsulamento como serviço do Windows

---

