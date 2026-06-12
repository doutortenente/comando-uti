<!--
PR Template — comando-uti / SASI
Há mais de uma sessão Claude (chat / cowork / Claude Code) trabalhando neste repo.
Este checklist evita que mudanças entrem sem que outras sessões fiquem sabendo.
-->

## 🩺 O que mudou e por quê

<!-- 1-3 frases. Foque no PORQUÊ, não só no quê. -->

## 🔎 Tipo de mudança

- [ ] 🐛 Bug fix (não muda comportamento esperado)
- [ ] ✨ Feature (adiciona funcionalidade)
- [ ] ♻️ Refator (sem mudança de comportamento)
- [ ] 🛠 Build / CI / config (deploy, env vars, dependências)
- [ ] 📚 Docs / STATUS.md
- [ ] 🗑 Limpeza / dead code

## ✅ Checklist obrigatório

### Multi-Claude sync
- [ ] Atualizei `STATUS.md` se a mudança afeta deploy, schema, auth, ou arquitetura
- [ ] Adicionei linha em "Histórico de decisões" se for decisão importante
- [ ] Não introduzi caminhos novos com caracteres não-ASCII

### Código
- [ ] `npm run typecheck` passa
- [ ] `npm run build` passa localmente
- [ ] Testei manualmente o fluxo afetado (login, dashboard, modal, etc.)
- [ ] Não tem `console.log` debug esquecido
- [ ] Não tem `any` novo (use `unknown` + narrow)

### Segurança / dados clínicos
- [ ] Nenhuma key, token, senha, ou PII está no diff
- [ ] Nenhum endpoint novo escreve em `pacientes`/`evolucoes` sem audit log
- [ ] RLS continua intacta (não troquei `auth.uid() = user_id` por `using (true)`)
- [ ] `service_role` key NÃO foi usada em código frontend

### Banco
- [ ] Mudanças de schema têm migration explícita (`supabase/migrations/`)
- [ ] Constraint `uti IN ('UTI2','UTI3','UTI4')` continua válida
- [ ] Views `vw_*` continuam `security_invoker`

## 🧪 Como testar

<!-- Passos concretos pra outro Claude (ou você no futuro) reproduzir. -->

1.
2.
3.

## 📸 Screenshots (se UI)

<!-- Drag & drop ou link. -->

## 🔗 Links relevantes

<!-- STATUS.md sections afetadas, issues, decisões prévias. -->

---

> **Lembrete:** se este PR muda env vars no Netlify, deploy strategy, ou auth URL, **AVISE no commit message**. Outro Claude vai ler o `git log` antes de mexer.
