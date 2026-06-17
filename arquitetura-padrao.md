# Arquitetura-Padrão de Pastas de Projeto

> Estrutura visual de referência para a raiz de qualquer projeto novo do Dr. Tenente.
> Fonte canônica de scaffolding — espelhada em `templates/arquitetura/`.

## Raiz mínima (qualquer linguagem)

```text
meu-projeto/
├── src/            Código-fonte da aplicação
├── tests/          Testes automatizados
├── .gitignore      O que NÃO vai pra nuvem
├── README.md       Documentação inicial
└── package.json    (ou requirements.txt / go.mod / composer.json) — dependências
```

## `.gitignore` base

```gitignore
# Senhas e variáveis de ambiente
chaves_secretas.txt
.env

# Dependências (baixáveis depois)
node_modules/
vendor/

# Logs e temporários do SO
*.log
.DS_Store
```

---

## 1. Node.js / JavaScript

```text
meu-projeto-node/
├── src/
│   ├── controllers/   Recebe requisições e envia respostas
│   ├── models/        Comunicação com o banco
│   ├── routes/        Caminhos da API (/usuarios, /login)
│   ├── services/      Lógica de negócio pesada
│   └── index.js       Liga o servidor
├── tests/             Jest / Mocha
├── .env               Segredos (nunca no GitHub)
├── .gitignore
└── package.json
```

## 2. Python (Backend / APIs)

> Usar ambientes virtuais (`venv`) para não misturar bibliotecas entre projetos.

```text
meu-projeto-python/
├── app/
│   ├── __init__.py
│   ├── main.py        Ponto de partida
│   ├── database.py    Conexão com o banco
│   └── routers/       Equivalente às rotas do Node
├── tests/             Pytest
├── venv/              Ambiente virtual (ignorado no Git)
├── .env
├── .gitignore
└── requirements.txt   Lista de bibliotecas
```

## 3. HTML (Web clássico / Vanilla)

> Site simples sem frameworks pesados — separação por tipo de arquivo.

```text
meu-site-html/
├── assets/    Imagens, vídeos, fontes, ícones
├── css/       Estilos (style.css, reset.css)
├── js/        Scripts do navegador (main.js)
└── index.html Página principal
```

## 4. PHP (Back-end moderno)

> Exige pasta `public/` para esconder configs do servidor.

```text
meu-projeto-php/
├── public/        Única pasta acessível pelo navegador
│   └── index.php  Recebe todo o tráfego
├── src/           Classes e lógica (escondido do usuário)
├── vendor/        Bibliotecas (ignorado no Git)
├── .env
├── .gitignore
└── composer.json
```

## 5. React (Frontend)

> Organiza a interface em componentes reutilizáveis.

```text
meu-projeto-react/
├── public/          Estáticos puros (favicon, index.html base)
├── src/
│   ├── assets/      Imagens e estilos globais
│   ├── components/  Pedaços reutilizáveis (Botao.jsx, Cabecalho.jsx)
│   ├── pages/       Telas completas (Home.jsx)
│   ├── hooks/       Funções personalizadas do React
│   ├── App.jsx      Componente mestre (rotas)
│   └── index.jsx    Injeta o React no HTML
├── .env             URLs de APIs externas
├── .gitignore
└── package.json
```

---

## Princípios universais

- **Separação de responsabilidades** (Separation of Concerns).
- Consistência acima de perfeição.
- **Nunca commitar segredos** (`.env` sempre no `.gitignore`).
- Type safety forte (TypeScript, Pydantic…).
- Comece simples (por camadas) → migre para **feature-based** ao escalar.

> Templates detalhados por ecossistema (Node-TS, FastAPI, React+Vite, SASI v2 monorepo):
> ver [`templates/arquitetura/`](templates/arquitetura/).
