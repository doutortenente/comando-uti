#!/usr/bin/env python3
"""Converte JSON canonico do SASI em SQL de deploy (pacientes + evolucoes).

Uso:
    python deploy.py pacientes.json            # imprime SQL no stdout
    python deploy.py pacientes.json --check     # so valida, nao gera SQL

O SQL gerado e idempotente por leito: antes de inserir cada paciente ele
remove qualquer paciente ATIVO no mesmo leito (o CASCADE remove evolucoes/
eventos/pendencias antigos). Rode o SQL resultante via a ferramenta Supabase
MCP `execute_sql` no projeto do SASI.

O JSON de entrada e uma lista de objetos paciente; cada um carrega uma
chave `evolucao` com o snapshot do plantao. Veja SKILL.md para o esquema.
"""
import json
import sys

# --- Constraints do banco (CHECK constraints reais da tabela) -------------
UTI_VALIDAS = {"UTI2", "UTI3", "UTI4"}
GRAVIDADE_VALIDAS = {"estavel", "moderado", "grave", "critico", "obito"}
STATUS_VALIDOS = {"ativo", "alta", "obito", "transferencia"}
ISOLATION_VALIDAS = {"none", "contact", "droplet", "aerosol"}
PLANTAO_VALIDOS = {"manha", "tarde", "noite", "plantao_24h"}

# Colunas JSONB da evolucao (o resto -- impressao/conduta -- e text[]).
EVO_JSONB = ["neuro", "resp", "hemo", "tgi", "renal", "hemato", "infecto",
             "dvas", "sedativos", "prescricao", "sofa_snapshot"]
EVO_TEXT_ARRAY = ["impressao", "conduta"]


def sql_str(value):
    """Literal SQL de texto, com aspas simples escapadas."""
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def sql_jsonb(obj):
    if obj is None:
        return "NULL"
    return sql_str(json.dumps(obj, ensure_ascii=False)) + "::jsonb"


def sql_text_array(items):
    items = items or []
    if not items:
        return "ARRAY[]::text[]"
    inner = ",".join(sql_str(x) for x in items)
    return f"ARRAY[{inner}]::text[]"


def validate(p, idx):
    errs = []
    leito = p.get("leito")
    if not leito:
        errs.append(f"[{idx}] 'leito' obrigatorio")
    if not p.get("nome"):
        errs.append(f"[{idx}] 'nome' obrigatorio")
    uti = p.get("uti", "UTI2")
    if uti not in UTI_VALIDAS:
        errs.append(f"[{idx}] uti '{uti}' invalida (use {sorted(UTI_VALIDAS)})")
    grav = p.get("gravidade", "estavel")
    if grav not in GRAVIDADE_VALIDAS:
        errs.append(f"[{idx}] gravidade '{grav}' invalida")
    status = p.get("status_leito", "ativo")
    if status not in STATUS_VALIDOS:
        errs.append(f"[{idx}] status_leito '{status}' invalido")
    iso = p.get("isolation", "none")
    if iso not in ISOLATION_VALIDAS:
        errs.append(f"[{idx}] isolation '{iso}' invalido")
    idade = p.get("idade")
    if idade is not None and not (0 <= idade <= 130):
        errs.append(f"[{idx}] idade {idade} fora de 0..130")
    evo = p.get("evolucao")
    if evo:
        plantao = evo.get("plantao", "manha")
        if plantao not in PLANTAO_VALIDOS:
            errs.append(f"[{idx}] plantao '{plantao}' invalido (use {sorted(PLANTAO_VALIDOS)})")
    return errs


def build_sql(pacientes):
    lines = ["BEGIN;", ""]
    for p in pacientes:
        leito = p["leito"]
        uti = p.get("uti", "UTI2")
        status = p.get("status_leito", "ativo")
        disp = p.get("dispositivos", {})
        cols = ["leito", "uti", "nome", "idade", "peso", "altura", "data_adm",
                "alergias", "gravidade", "status_leito", "dispositivos",
                "isolation", "out_of_range_count"]
        vals = [
            sql_str(leito), sql_str(uti), sql_str(p["nome"]),
            str(p["idade"]) if p.get("idade") is not None else "NULL",
            str(p["peso"]) if p.get("peso") is not None else "NULL",
            str(p["altura"]) if p.get("altura") is not None else "NULL",
            sql_str(p.get("data_adm")), sql_str(p.get("alergias")),
            sql_str(p.get("gravidade", "estavel")), sql_str(status),
            sql_jsonb(disp), sql_str(p.get("isolation", "none")),
            str(p.get("out_of_range_count", 0)),
        ]
        # Limpa qualquer paciente ativo previo no mesmo leito (CASCADE).
        lines.append(
            f"DELETE FROM pacientes WHERE leito = {sql_str(leito)} "
            f"AND status_leito = 'ativo';")
        lines.append(
            f"WITH novo AS (\n"
            f"  INSERT INTO pacientes ({', '.join(cols)})\n"
            f"  VALUES ({', '.join(vals)})\n"
            f"  RETURNING id\n"
            f")")
        evo = p.get("evolucao")
        if evo:
            ecols = ["paciente_id", "data_evolucao", "plantao"]
            esel = ["novo.id", "NOW()", sql_str(evo.get("plantao", "manha"))]
            for c in EVO_JSONB:
                if c in evo:
                    ecols.append(c)
                    esel.append(sql_jsonb(evo[c]))
            for c in EVO_TEXT_ARRAY:
                if c in evo:
                    ecols.append(c)
                    esel.append(sql_text_array(evo[c]))
            if evo.get("sofa_total") is not None:
                ecols.append("sofa_total")
                esel.append(str(evo["sofa_total"]))
            lines.append(
                f"INSERT INTO evolucoes ({', '.join(ecols)})\n"
                f"SELECT {', '.join(esel)} FROM novo;")
        else:
            lines.append("SELECT id FROM novo;")
        lines.append("")
    lines.append("COMMIT;")
    return "\n".join(lines)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    if not args:
        sys.exit("uso: python deploy.py pacientes.json [--check]")
    with open(args[0], encoding="utf-8") as fh:
        data = json.load(fh)
    if isinstance(data, dict):
        data = [data]
    all_errs = []
    for i, p in enumerate(data):
        all_errs.extend(validate(p, i))
    if all_errs:
        sys.stderr.write("ERROS DE VALIDACAO:\n" + "\n".join(all_errs) + "\n")
        sys.exit(1)
    if "--check" in flags:
        sys.stderr.write(f"OK: {len(data)} paciente(s) validados.\n")
        return
    print(build_sql(data))


if __name__ == "__main__":
    main()
