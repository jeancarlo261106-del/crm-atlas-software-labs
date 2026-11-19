# Atlas CRM

CRM da Atlas Software Labs com persistência local em IndexedDB (Dexie). O aplicativo abre o banco original `AtlasCRM`, versão Dexie 1, tabela `leads`. Os seis exemplos são inseridos apenas na criação do banco.

## Executar

Use Node.js 22.12 ou superior:

```sh
npm install
npm run dev
```

Para acessar os cadastros anteriores, use o mesmo perfil do navegador e a mesma origem (protocolo, endereço e porta). `localhost` e `127.0.0.1` têm bases diferentes. Não é necessário configurar credenciais.

## Uso offline e backup

Execute `npm run build` e `npm run preview` para testar o build de produção. Após a primeira carga e a instalação do service worker, o CRM pode reabrir, consultar e gravar sem conexão. Para publicar, hospede `dist` em HTTPS.

Em **Configurações**, o backup completo JSON preserva empresas, checklists e datas de fechamento. Restaurar um backup substitui a base local após confirmação. Para mesclar empresas, use **Planilha mestre > Importar planilha / Sync IA** e confira a prévia antes de confirmar.

## Verificação

```sh
npx playwright install chromium
npm run build
npm test
```

Os testes usam bancos temporários em perfis isolados do navegador, incluindo uma base com o esquema anterior já preenchida.
