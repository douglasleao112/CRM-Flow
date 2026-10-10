# WhatsApp Flow Builder v2.3

## Correções principais

- Nome interno atualizado corretamente para **v2.3**.
- Permissão `unlimitedStorage` adicionada.
- Suporte para fluxos grandes, incluindo áudio, imagem e vídeo em Base64.
- Importação compatível com:
  - lista direta de fluxos;
  - `{ "flows": [...] }`;
  - `{ "wfFlows": [...] }`.
- Fluxos e blocos antigos são normalizados automaticamente.
- O JSON é salvo automaticamente após a importação.
- O botão Salvar mostra erros reais quando o armazenamento falhar.
- A versão aparece no rodapé do popup.

## Instalação importante

Remova completamente a versão anterior no Chrome antes de carregar esta versão.

Depois:

1. Extraia o ZIP.
2. Abra `chrome://extensions`.
3. Ative o modo de desenvolvedor.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `whatsapp-flow-extension-v2.3`.
6. Reimporte o JSON.
