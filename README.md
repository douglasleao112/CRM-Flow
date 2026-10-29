# CRM Flow

Versão atual: **1.0.0**

Extensão unificada com os módulos de **WhatsApp**, **Gmail** e **Instagram/FlowSI**.

## Correções principais

- Nome interno atualizado corretamente para **v2.3**.
- Permissão `unlimitedStorage` adicionada.
- Suporte para fluxos grandes, incluindo áudio, imagem e vídeo em Base64.
- Variações aleatórias de textos, áudios, imagens e vídeos.
- Conversão automática de áudio para OGG/Opus e envio como mensagem de voz.
- Conversão automática de vídeos incompatíveis para MP4/H.264.
- Agendamentos com texto e mídia por variação.
- Kanban por etiquetas e acompanhamento de falhas.
- Importação compatível com:
  - lista direta de fluxos;
  - `{ "flows": [...] }`;
  - `{ "wfFlows": [...] }`.
- Fluxos e blocos antigos são normalizados automaticamente.
- O JSON é salvo automaticamente após a importação.
- O botão Salvar mostra erros reais quando o armazenamento falhar.
- A versão aparece no rodapé do popup.
- Menu **Email** integrado ao popup, ao lado de **Extrair números**.
- Menu **Instagram** integrado ao popup, com acesso direto ao inbox.
- FlowSI incorporado à mesma extensão: Kanban do Direct, CRM e notas, chatbots, mensagens rápidas e mensagens em massa.
- Envio individual pelo Gmail com até três modelos, texto ou HTML.
- Importação de contatos por CSV/TXT, rodízio com peso, intervalo aleatório e pausa por blocos.
- O módulo de Gmail é carregado somente em `mail.google.com`, separado do engine do WhatsApp.
- O controle mestre fica ao lado da quantidade de fluxos e ativa ou desativa todos de uma vez.
- Ao desligar o controle mestre, a lista de fluxos é recolhida e fica escondida.
- O painel de email segue o padrão visual verde do CRM Flow e usa somente uma barra de rolagem no popup.
- O envio localiza uma aba aberta do Gmail mesmo quando ela não é a aba ativa.
- As listas de email podem ser salvas com nome, data de criação e quantidade de contatos para reutilização posterior.
- O módulo de email usa a coluna e a variável `empresa`, mantendo compatibilidade com listas antigas que ainda usam `academia`.
- O Email permite criar até cinco variações com assunto, mensagem ou HTML próprios e escolha aleatória com chances iguais.
- O seletor global Texto/HTML foi removido; o formato agora é identificado automaticamente em cada variação.
- O arquivo HTML é selecionado por um link discreto no cabeçalho do campo de mensagem, que também aceita código HTML colado diretamente.
- O controle de disparo por blocos usa rótulos e resumo compactos, sem descrições redundantes.
- As variáveis `{{empresa}}`, `{{nome}}` e `{{email}}` aparecem como orientação simples dentro do campo de mensagem.
- A área de listas foi reorganizada e exibe a quantidade de emails em uma badge dentro da prévia.
- A prévia da lista inicia recolhida, com a badge antes do título e um controle de dropdown à direita.

## Instalação importante

1. Baixe ou clone este repositório.
2. Abra `chrome://extensions`.
3. Ative o modo de desenvolvedor.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta do projeto que contém o arquivo `manifest.json`.

## Envio por email

1. Abra e mantenha o Gmail conectado em uma aba.
2. Abra o popup do CRM Flow e clique em **Email**.
3. Configure ao menos um modelo, carregue a lista CSV/TXT e confirme a autorização dos contatos.
4. Com a aba do Gmail ativa, clique em **Iniciar envio**.
