import { blank, changed, fields, validate, type Lead } from "./data";
import { db } from "./services/leadsLocal";
export const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const nameKey = (l: Partial<Lead>) =>
  JSON.stringify(
    [l.empresa, l.cidade].map((v) =>
      v?.trim().normalize("NFC").toLocaleLowerCase("pt-BR"),
    ),
  );
export function plan(rows: unknown, base: Lead[]) {
  if (!Array.isArray(rows) || !rows.length)
    throw Error("A planilha não contém empresas.");
  const ids = new Map(base.map((l) => [l.id, l])),
    seen = new Set<string>();
  return rows.map((row, i) => {
    try {
      if (!row || typeof row !== "object" || Array.isArray(row))
        throw Error("Registro inválido.");
      const patch: Record<string, string | number> = {};
      for (const f of fields)
        if (Object.hasOwn(row, f) && row[f] != null) {
          if (typeof row[f] !== "string" && typeof row[f] !== "number")
            throw Error(`Campo inválido: ${f}.`);
          patch[f] =
            f === "valor_projeto" || f === "valor_mrr"
              ? Number(String(row[f]).replace(",", "."))
              : String(row[f]).trim();
        }
      if (patch.id && !uuid.test(String(patch.id)))
        throw Error("ID deve ser UUID.");
      const matches = base.filter((l) => nameKey(l) === nameKey(patch)),
        byId = ids.get(String(patch.id));
      if (!byId && matches.length > 1)
        throw Error("Nome e cidade ambíguos. Informe o ID.");
      const old = byId || matches[0];
      if (byId && matches.some((l) => l.id !== byId.id))
        throw Error("ID e nome apontam para empresas diferentes.");
      const remove = patch.acao_sync === "remover";
      if (
        patch.acao_sync &&
        !["ativo", "remover"].includes(String(patch.acao_sync))
      )
        throw Error("Ação de sync inválida.");
      if (remove && !old) throw Error("Empresa a remover não encontrada.");
      const id = old?.id || String(patch.id || crypto.randomUUID());
      const l = remove
        ? old!
        : changed(old || blank(), { ...patch, id, acao_sync: "ativo" });
      const key = nameKey(l);
      if (seen.has(key) || seen.has(id))
        throw Error("Empresa repetida no arquivo.");
      seen.add(key);
      seen.add(id);
      return {
        op: remove ? "Remover" : old ? "Atualizar" : "Adicionar",
        l,
        previous: old?.atualizado_em,
      };
    } catch (e) {
      throw Error(`Registro ${i + 1}: ${(e as Error).message}`);
    }
  });
}
export async function apply(diff: ReturnType<typeof plan>) {
  await db.transaction("rw", db.leads, async () => {
    const current = await db.leads.toArray();
    for (const { op, l, previous } of diff) {
      if (
        current.find((v) => v.id === l.id)?.atualizado_em !== previous ||
        current.some((v) => v.id !== l.id && nameKey(v) === nameKey(l))
      )
        throw Error("A base mudou. Gere a prévia novamente.");
      if (op === "Remover") await db.leads.delete(l.id);
      else await db.leads.put(l);
    }
  });
}
export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function spreadsheet(
  list: Lead[],
  format: string,
  template = false,
) {
  const data = list.map((l) =>
    Object.fromEntries(fields.map((k) => [k, l[k]])),
  );
  if (format === "json")
    return download(
      "atlas-empresas.json",
      JSON.stringify(data, null, 2),
      "application/json",
    );
  const X = await import("xlsx"),
    sheet = X.utils.json_to_sheet(data, { header: [...fields] });
  if (format === "csv")
    return download(
      "atlas-empresas.csv",
      "\uFEFF" + X.utils.sheet_to_csv(sheet),
      "text/csv;charset=utf-8",
    );
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, sheet, "Empresas");
  X.writeFile(wb, template ? "atlas-template.xlsx" : "atlas-empresas.xlsx");
}
export async function parseInput(input: string | File) {
  const file = typeof input === "string" ? null : input;
  const text = file
    ? /\.xlsx$/i.test(file.name)
      ? null
      : await file.text()
    : String(input);
  if (
    text !== null &&
    (/^[\s\uFEFF]*[\[{]/.test(text) || file?.name.endsWith(".json"))
  )
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  const X = await import("xlsx"),
    wb =
      text !== null
        ? X.read(text, { type: "string", raw: true })
        : X.read(await file!.arrayBuffer(), { type: "array" });
  return X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
}
export function readBackup(text: string): Lead[] {
  const b = JSON.parse(text),
    seen = new Set<string>();
  if (b.app !== "Atlas CRM" || b.version !== 1 || !Array.isArray(b.empresas))
    throw Error("Arquivo de backup incompatível.");
  return b.empresas.map((l: Lead) => {
    if (
      !l ||
      !uuid.test(l.id) ||
      seen.has(l.id) ||
      fields.some(
        (k) =>
          typeof l[k] !==
          (["valor_mrr", "valor_projeto"].includes(k) ? "number" : "string"),
      ) ||
      typeof l.demo !== "boolean" ||
      !Array.isArray(l.checks) ||
      l.checks.some((n) => !Number.isInteger(n) || n < 0 || n > 6) ||
      typeof l.closed !== "string" ||
      !Number.isFinite(Date.parse(l.atualizado_em))
    )
      throw Error("Backup com registro inválido.");
    validate(l);
    seen.add(l.id);
    return l;
  });
}
