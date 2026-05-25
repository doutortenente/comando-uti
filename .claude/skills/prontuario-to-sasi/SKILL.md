---
name: prontuario-to-sasi
description: Converte texto bruto de prontuario de UTI (OCR, foto, copiar-colar, passagem de plantao) em JSON canonico do SASI e faz o deploy para o Supabase (tabelas pacientes + evolucoes). Use quando o usuario fornecer evolucao/prescricao/sinais vitais de pacientes de UTI e pedir para extrair, estruturar, importar, subir ou cadastrar no SASI / Comando UTI.
---

# Prontuario -> SASI

Pipeline para transformar prontuario cru (OCR de foto, PDF, prints de monitor,
passagem de plantao colada) em registros estruturados no banco do SASI.

## Quando usar

- O usuario cola/anexa texto clinico de um ou mais pacientes de UTI.
- Pede para "extrair para JSON", "subir pro SASI", "cadastrar os pacientes",
  "importar evolucao", "deploy dos leitos".

## Fluxo (4 passos)

1. **Extrair** o texto bruto para o **JSON canonico** (esquema abaixo).
2. **Validar**: `python scripts/deploy.py pacientes.json --check`
3. **Gerar SQL**: `python scripts/deploy.py pacientes.json > deploy.sql`
4. **Deploy**: executar o `deploy.sql` via ferramenta Supabase MCP
   `execute_sql` no projeto do SASI (`project_id = idswehsvvqczzkiatuzu`).
   Depois confirmar com um `SELECT leito, nome FROM pacientes WHERE status_leito='ativo'`.

O SQL e idempotente por leito: cada paciente remove o paciente ATIVO anterior
no mesmo leito (FK `ON DELETE CASCADE` limpa evolucoes/eventos antigos) e
insere o registro novo + a evolucao do plantao. Reexecutar = sobrescrever.

## Esquema canonico (entrada do deploy.py)

Lista de objetos paciente; cada um carrega `evolucao` com o snapshot do plantao.

```json
[
  {
    "leito": "02",                 // string; obrigatorio
    "uti": "UTI2",                 // UTI2 | UTI3 | UTI4 (default UTI2)
    "nome": "NOME COMPLETO",       // obrigatorio
    "idade": 41,                   // 0..130
    "peso": null,                  // kg, opcional
    "altura": null,                // cm, opcional
    "data_adm": "2026-05-22",      // ISO date, opcional
    "alergias": "Digesan",         // texto livre, opcional
    "gravidade": "critico",        // estavel | moderado | grave | critico | obito
    "status_leito": "ativo",       // ativo | alta | obito | transferencia
    "isolation": "none",           // none | contact | droplet | aerosol
    "dispositivos": {"mv":false,"dva":true,"sed":false,"atb":true,"cvc":true,"trr":false},
    "out_of_range_count": 7,       // nº de parametros fora de faixa nas 12-24h
    "evolucao": {
      "plantao": "manha",          // manha | tarde | noite | plantao_24h
      "neuro":   { "sedacao_analgesia": "...", "escalas": ["GCS 15"] },
      "resp":    { "fr": {"max":24,"min":18,"n_maior_25":0},
                   "spo2": {"max":99,"min":95,"suporte":"Cateter O2 2L","n_menor_88":0},
                   "ausculta": "..." },
      "hemo":    { "pas": {"max":124,"min":84,"n_maior_180":0,"n_menor_100":0},
                   "pad": {"max":82,"min":47}, "pam": {"max":91,"min":57,"n_menor_65":5},
                   "fc": {"max":106,"min":88,"n_maior_100":1},
                   "ausculta": "...", "perfusao": "..." },
      "tgi":     { "dx": {"valores":"165 / 125","n_maior_180":0},
                   "dieta": {"tipo":"Branda VO","ingesta_hidrica_ml":1000},
                   "evacuacoes": "..." },
      "renal":   { "ur_tendencia":"33 > 67", "cr_tendencia":"0,9 > 2,1",
                   "eletrolitos": {"mg":1.9,"na":140,"cai":1.2,"k":4.3,"p":null},
                   "diurese_total_ml":1100, "bh_ml":839 },
      "hemato":  { "hb":"14 > 12", "ht":"43 > 34", "plaquetas":"198000 > 202000",
                   "profilaxias":"Clexane 40mg SC + Pantoprazol 40mg EV" },
      "infecto": { "tmax": {"valor":null,"n_maior_38":0},
                   "atbs": [ {"droga":"Cefuroxima 750mg EV 8/8h","dia_tratamento":"D3"} ],
                   "culturas": ["..."], "leucocitos":"15800 > 20900" },
      "dvas":      [ {"droga":"Noradrenalina","dose":"0,12 mcg/kg/min"} ],
      "sedativos": [],
      "prescricao": { "cardiovascular": ["Clexane 40mg SC 1x/dia"],
                      "snc": [], "gastro_endocrino": ["Pantozol 40mg EV 12/12h"],
                      "infeccioso_resp": [], "sintomaticos_sn": [],
                      "solucoes_diureticos": ["Lasix 20mg EV"], "nutricao": [] },
      "impressao": ["problema ativo 1", "problema ativo 2"],
      "conduta":   ["plano 1", "plano 2"]
    }
  }
]
```

## Regras criticas do banco (NAO violar -- sao CHECK constraints reais)

| Campo | Valores aceitos |
|-------|-----------------|
| `pacientes.uti` | **UTI2, UTI3, UTI4** (NAO aceita "UTI", "UTI Geral") |
| `pacientes.gravidade` | estavel, moderado, grave, critico, obito |
| `pacientes.status_leito` | ativo, alta, obito, transferencia |
| `pacientes.isolation` | none, contact, droplet, aerosol |
| `pacientes.idade` | 0 a 130 |
| `evolucoes.plantao` | **manha, tarde, noite, plantao_24h** (sem acento, sem data) |
| `evolucoes.impressao` / `conduta` | **text[]** (array de texto, NAO jsonb) |
| `evolucoes.neuro/resp/hemo/tgi/renal/hemato/infecto/dvas/sedativos/prescricao` | jsonb |

`severidade_visual` e preenchido por trigger a partir de `gravidade` -- nao enviar.

## Regras de extracao (texto cru -> JSON)

- **Arrays sempre arrays** (`atbs`, `culturas`, `dvas`, `sedativos`, `impressao`,
  `conduta`), mesmo com 0 ou 1 item -- o front quebra se vier string/objeto.
- **`gravidade`**: critico = choque/DVA/SCAI C/refratario; grave = IRpA, pos-trombolise,
  instabilidade; moderado = estavel sob vigilancia; estavel = enfermaria-like.
- **`dispositivos`**: marque `dva`=true se ha noradrenalina/dobutamina etc.,
  `atb`=true se ha antibiotico ativo, `cvc`=true se CVC/PICC/PAI, `trr`=true se
  dialise, `mv`=true se IOT/ventilacao mecanica, `sed`=true se sedacao continua.
- **`out_of_range_count`**: some os contadores fora de faixa (PAM<65, FC>100,
  DX>180, SpO2<88, etc.) das ultimas 12-24h.
- **Diagnosticos auto-codificados (CID) costumam vir errados** em exports de
  prescricao (ex.: "CONJUNTIVITE" para uma cardiopata). Prefira sempre os
  diagnosticos/impressao da evolucao clinica narrativa; ignore codigos CID
  obviamente incongruentes e sinalize ao usuario.
- **Conflito de sinais vitais entre fontes** (evolucao detalhada vs print de
  monitor/prescricao): pergunte ao usuario qual e a fonte vigente antes de
  sobrescrever -- nao invente.
- **Prescricao / Kardex**: gravada na coluna `evolucoes.prescricao` (jsonb),
  objeto com categorias `cardiovascular`, `snc`, `gastro_endocrino`,
  `infeccioso_resp`, `sintomaticos_sn`, `solucoes_diureticos`, `nutricao` --
  cada uma um array de strings. Alem disso, espelhe os itens relevantes nos
  campos clinicos: DVA -> `dvas`; sedacao continua -> `sedativos`; profilaxia
  (heparina/IBP) -> `hemato.profilaxias`.

## Verificacao pos-deploy

Depois de rodar o SQL, confirme:

```sql
SELECT p.leito, p.nome, p.gravidade, e.plantao
FROM pacientes p
LEFT JOIN evolucoes e ON e.paciente_id = p.id
WHERE p.status_leito = 'ativo'
ORDER BY p.leito;
```
