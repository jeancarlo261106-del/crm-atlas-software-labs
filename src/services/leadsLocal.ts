import Dexie, { type Table } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { changed, type Lead } from "../data";
import { exampleLeads } from "../examples";

const db = new Dexie("AtlasCRM") as Dexie & { leads: Table<Lead, string> };
db.version(1).stores({ leads: "id,estagio_funil,cidade,nicho" });
db.on("populate", (tx) => tx.table("leads").bulkAdd(exampleLeads()));

export function useLeads() {
  const list = useLiveQuery(
    async () =>
      (await db.leads.toArray()).sort((a, b) =>
        a.empresa.localeCompare(b.empresa, "pt-BR"),
      ),
    [],
  );
  return { list, status: list ? "connected" : "loading" };
}
export const createLead = (lead: Lead) => db.leads.add(lead);
export async function update(id: string, patch: Partial<Lead>) {
  await db.transaction("rw", db.leads, async () => {
    const old = await db.leads.get(id);
    if (!old) throw Error("Empresa removida.");
    await db.leads.put(changed(old, patch));
  });
}
export const removeRows = (ids: string[]) => db.leads.bulkDelete(ids);
export const restore = (rows: Lead[]) =>
  db.transaction("rw", db.leads, async () => {
    await db.leads.clear();
    await db.leads.bulkAdd(rows);
  });
export const syncRows = (
  rows: { id: string; estagio_funil: string; _expected: string }[],
) =>
  db.transaction("rw", db.leads, async () => {
    for (const row of rows) {
      const old = await db.leads.get(row.id);
      if (!old || old.atualizado_em !== row._expected)
        throw Error("A base mudou. Revise a seleção.");
      await db.leads.put(changed(old, { estagio_funil: row.estagio_funil }));
    }
  });
export { db };
