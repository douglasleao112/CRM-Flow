# Zapflow — WhatsApp Flow Builder

Versão atual: **2.16.39**

## Correções principais

- Nome interno atualizado corretamente para **v2.3**.
- Permissão `unlimitedStorage` adicionada.
- Suporte para fluxos grandes, incluindo áudio, imagem e vídeo em Base64.
- Variações aleatórias de textos, áudios, imagens e vídeos.
- Conversão automática de áudio para OGG/Opus e envio como mensagem de voz.
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

## Instalação importante

1. Baixe ou clone este repositório.
2. Abra `chrome://extensions`.
3. Ative o modo de desenvolvedor.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta do projeto que contém o arquivo `manifest.json`.
