# ComprasFit

## Versão web responsiva

O mesmo projeto oferece uma interface web para celular, tablet e computador. A partir de 700 px, o cardápio usa duas colunas; a partir de 900 px, a navegação aparece na lateral. Em telas de 1400 px ou mais, o cardápio usa três colunas. Em celulares, o menu permanece na parte inferior. A apresentação e os detalhes das receitas ganham duas colunas no computador. Favoritos e preferências ficam salvos no navegador usado.

```bash
npm ci
npm run web
```

Para gerar os arquivos estáticos de produção:

```bash
npm run build:web
```

Publique o conteúdo de `dist/` em uma hospedagem de sites estáticos. O build usa a API publicada do backend quando `EXPO_PUBLIC_API_BASE_URL` está configurada (o app possui um fallback para o endereço publicado do backend). A lista de compras pode ser compartilhada, copiada quando o navegador permite ou baixada como texto. Para visualizar no seu computador, execute os comandos localmente; a porta do servidor na nuvem não fica automaticamente acessível pela internet.

Teste opcional de interface (requer Python, Playwright e Chromium): gere o build, sirva `dist` na porta 8090 e execute `python scripts/test_web.py`. A URL pode ser alterada com `COMPRASFIT_TEST_URL`. O teste cobre larguras de 320 a 1440 px, navegação por teclado, configuração inicial, favoritos, receitas, lista de compras, download e persistência. Capturas são salvas em `/tmp/comprasfit-web`.

Frontend mobile em **React Native, Expo e TypeScript**, baseado nas 18 páginas do PDF de referência fornecido. A integração com o backend usa os endpoints de produtos, receitas, planejamento e atualização de itens. As rotas privadas exigem uma sessão do Supabase.

## Executar

Requer Node.js 22.13+ ou 24.3+ (validado com 24.19) e npm.

```bash
npm ci
npm start
```

Abra pelo Expo Go compatível com SDK 58 no celular. O aparelho precisa alcançar a máquina que executa o Metro; em uma máquina na nuvem pode ser necessário um túnel ou um development build. O terminal informa as opções de conexão. Android Studio e Xcode são necessários somente para usar os respectivos emuladores locais; iOS Simulator exige macOS.

```bash
npm run android  # emulador Android ou aparelho configurado
npm run ios      # simulador iOS, em macOS
npm run web      # validação alternativa no navegador
```

No ambiente cloud, execute `bash scripts/setup.sh` para instalar com o lockfile e usar caches em diretórios graváveis. Não são necessárias variáveis de API ou credenciais.

## Funcionalidades

- Apresentação e configuração de nome, mercado, pessoas, dias, orçamento, objetivos, restrições e equipamentos.
- Planejamento semanal local, com catálogo pequeno e estimativa de custo; aviso quando o mínimo disponível ultrapassa o orçamento.
- Receitas com ingredientes, preparo, favoritos e substituição por outra receita compatível.
- Lista de compras que agrega quantidades por ingrediente e número de pessoas, marcação de compras e compartilhamento nativo.
- Tema claro/escuro, início da semana, configurações e exclusão dos dados com confirmação.
- Perfil, plano, favoritos e compras persistidos no dispositivo com AsyncStorage. Cancelar a edição preserva o plano anterior. As fotos e a ilustração de apresentação foram extraídas do PDF enviado.

## Limites desta versão

O catálogo, os preços e os dados nutricionais são **dados de demonstração**, sem consulta aos supermercados. As preferências de objetivo priorizam receitas locais quando há correspondência; não constituem um recomendador nutricional. Restrições se aplicam somente às categorias disponíveis no catálogo, sem garantia de ausência de alérgenos. O bowl vegetariano usa uma foto ilustrativa reaproveitada do design. Sem login, o app continua em modo local. Com login, o planejamento é enviado ao backend e a lista de compras usa os itens e preços retornados pela API. Marcas dos mercados são apresentadas em texto; assets de alta resolução do Figma podem substituir os recortes do PDF depois.

O estado e os comandos da interface estão centralizados em `src/state/AppState.tsx`; modelos e funções de planejamento estão em `src/data`. Essa é a fronteira para incorporar o contrato real da API posteriormente. Não foi inventado um endpoint.

## Verificação

```bash
npm run typecheck
npm test
npm run export -- --platform all
```

Os testes verificam restrições, compatibilidade de equipamentos, ordem dos dias, orçamento e agregação da lista. A exportação gera bundles de Android, iOS e web; não é um APK/IPA e não substitui um teste em aparelho real.
\n\n## Variáveis de ambiente\n\nPara o build web e para o Expo, crie um `.env` local ou configure as variáveis no provedor de deploy:\n\n```dotenv\nEXPO_PUBLIC_API_BASE_URL=https://backend-compras-fit.vercel.app\nEXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel\n```\n\nA URL do frontend publicada (`https://comprasfit-web.vercel.app`, ou seu domínio personalizado) deve estar cadastrada em `CORS_ORIGIN` no backend. A chave publicável pode ser usada no cliente; nunca coloque a chave secreta do Supabase no frontend.\n