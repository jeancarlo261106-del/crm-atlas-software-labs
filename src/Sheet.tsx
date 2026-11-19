import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Copy,
  Check,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { fields, labels, money, stages, type Field, type Lead } from "./data";
import { removeRows, syncRows, update } from "./services/leadsLocal";
import { apply, parseInput, plan, spreadsheet } from "./sync";
import { editable, FieldInput, Links, Modal, report } from "./ui";
const promptIA = `Retorne um array JSON ou CSV em pt-BR com estes cabeçalhos exatos: ${fields.join(",")}. Inclua empresa e cidade. Não invente contatos. Para novas empresas, deixe id vazio. Para atualizar, preserve o UUID ou identifique por empresa+cidade. Omita campos desconhecidos nas atualizações JSON. Use acao_sync=ativo; use remover somente quando solicitado. Estágios: ${stages.join("; ")}. Status digital: Sem Site, Linktree/Instagram, Site Lento/Antigo, Sistema Manual. Use números decimais sem símbolo monetário.`;
function Transfer({
  mode,
  close,
  list,
  filtered,
}: {
  mode: string;
  close: () => void;
  list: Lead[];
  filtered: Lead[];
}) {
  const [text, setText] = useState(""),
    [file, setFile] = useState<File>(),
    [diff, setDiff] = useState<ReturnType<typeof plan>>(),
    [error, err] = useState(""),
    [format, fmt] = useState("xlsx"),
    [scope, sc] = useState("all"),
    [busy, working] = useState(false),
    [copied, setCopied] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    working(true);
    err("");
    try {
      await fn();
    } catch (e) {
      err((e as Error).message);
    } finally {
      working(false);
    }
  };
  return (
    <Modal title={mode} close={close}>
      <div className="stack">
        {mode === "Exportar planilha" ? (
          <>
            <label>
              Empresas
              <select value={scope} onChange={(e) => sc(e.target.value)}>
                <option value="all">Toda a base ({list.length})</option>
                <option value="filtered">
                  Resultado dos filtros ({filtered.length})
                </option>
              </select>
            </label>
            <label>
              Formato
              <select value={format} onChange={(e) => fmt(e.target.value)}>
                {["xlsx", "csv", "json"].map((f) => (
                  <option key={f} value={f}>
                    {f.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await spreadsheet(scope === "all" ? list : filtered, format);
                  close();
                })
              }
            >
              Baixar arquivo
            </button>
          </>
        ) : mode === "Template IA" ? (
          <>
            <label>
              Instruções para a IA
              <textarea readOnly rows={7} value={promptIA} />
            </label>
            <button
              onClick={() =>
                run(async () => {
                  await navigator.clipboard.writeText(promptIA);
                  setCopied(true);
                  toast.success("Instruções copiadas.");
                })
              }
            >
              {copied ? <Check /> : <Copy />}
              {copied ? "Prompt copiado" : "Copiar prompt"}
            </button>
            <button
              className="primary"
              onClick={() => run(() => spreadsheet([], "xlsx", true))}
            >
              <Download />
              Baixar template XLSX
            </button>
          </>
        ) : diff ? (
          <>
            <h3>Prévia da sincronização</h3>
            <div className="summary">
              {["Adicionar", "Atualizar", "Remover"].map((op) => (
                <span key={op}>
                  {op}: <b>{diff.filter((r) => r.op === op).length}</b>
                </span>
              ))}
            </div>
            <ul className="preview">
              {diff.map((r) => (
                <li key={r.l.id}>
                  {r.op}: {r.l.empresa} ({r.l.cidade})
                </li>
              ))}
            </ul>
            <div className="footer-actions">
              <button
                onClick={() => {
                  setDiff(undefined);
                  err("");
                }}
              >
                Voltar
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await apply(diff);
                    toast.success("Sincronização concluída.");
                    close();
                  })
                }
              >
                Confirmar alterações
              </button>
            </div>
          </>
        ) : (
          <>
            <label>
              Arquivo CSV, XLSX ou JSON
              <input
                type="file"
                accept=".csv,.xlsx,.json"
                onChange={(e) => setFile(e.target.files?.[0])}
              />
            </label>
            <label>
              Ou cole CSV ou JSON
              <textarea
                rows={6}
                disabled={!!file}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button
              className="primary"
              disabled={busy || !(file || text.trim())}
              onClick={() =>
                run(async () => {
                  setDiff(plan(await parseInput(file || text), list));
                })
              }
            >
              Gerar prévia
            </button>
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
function Cell({ l, k }: { l: Lead; k: Field }) {
  const [edit, set] = useState(false),
    [value, val] = useState<string | number>(l[k]);
  if (k === "estagio_funil")
    return (
      <label className="cell">
        <span className="sr-only">Estágio de {l.empresa}</span>
        <select
          value={l[k]}
          onChange={(e) => update(l.id, { [k]: e.target.value }).catch(report)}
        >
          {stages.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
    );
  const enter = () => {
    val(l[k]);
    set(true);
  };
  if (edit)
    return (
      <form
        className="inline-edit"
        onKeyDown={(e) => {
          if (e.key === "Escape") set(false);
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await update(l.id, { [k]: value });
            set(false);
          } catch (e) {
            report(e);
          }
        }}
      >
        <label>
          <span className="sr-only">{labels[k]}</span>
          <FieldInput field={k} value={value} onChange={val} />
        </label>
        <button>Salvar</button>
        <button type="button" onClick={() => set(false)}>
          Cancelar
        </button>
      </form>
    );
  return (
    <button
      className="cell-value"
      title={`Editar ${labels[k]}`}
      onDoubleClick={enter}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          enter();
        }
      }}
    >
      {k.startsWith("valor_") ? money(Number(l[k])) : l[k] || "Sem registro"}
    </button>
  );
}
export function Sheet({
  list,
  edit,
}: {
  list: Lead[];
  edit: (l: Lead) => void;
}) {
  const [query, q] = useState(""),
    [filters, filt] = useState<Record<string, string>>({}),
    [sort, sorting] = useState<SortingState>([]),
    [sel, select] = useState<Record<string, boolean>>({}),
    [mode, setMode] = useState(""),
    [stage, setStage] = useState("");
  const fq = [
    "cidade",
    "nicho",
    "estagio_funil",
    "status_digital_atual",
  ] as Field[];
  const filtered = useMemo(
    () =>
      list.filter(
        (l) =>
          Object.entries(filters).every(
            ([k, v]) => !v || l[k as Field] === v,
          ) &&
          fields.some((k) =>
            String(l[k])
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase()),
          ),
      ),
    [list, filters, query],
  );
  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        id: "sel",
        header: ({ table: t }) => (
          <label>
            <span className="sr-only">Selecionar resultados</span>
            <input
              type="checkbox"
              checked={t.getIsAllRowsSelected()}
              onChange={t.getToggleAllRowsSelectedHandler()}
            />
          </label>
        ),
        cell: ({ row }) => (
          <label>
            <span className="sr-only">Selecionar {row.original.empresa}</span>
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
            />
          </label>
        ),
      },
      {
        id: "links",
        header: "Ações",
        cell: ({ row }) => (
          <div className="links">
            <button
              aria-label={`Editar ${row.original.empresa}`}
              onClick={() => edit(row.original)}
            >
              <Pencil />
            </button>
            <Links l={row.original} />
          </div>
        ),
      },
      ...(
        [
          "empresa",
          "cidade",
          "nicho",
          "estagio_funil",
          "valor_projeto",
          ...editable.filter(
            (k) =>
              ![
                "empresa",
                "cidade",
                "nicho",
                "estagio_funil",
                "valor_projeto",
              ].includes(k),
          ),
        ] as Field[]
      ).map((k) => ({
        accessorKey: k,
        header: labels[k],
        cell: ({ row }: { row: { original: Lead } }) => (
          <Cell l={row.original} k={k} />
        ),
      })),
    ],
    [edit],
  );
  const table = useReactTable({
    data: filtered,
    columns,
    getRowId: (l) => l.id,
    state: { sorting: sort, rowSelection: sel },
    onSortingChange: sorting,
    onRowSelectionChange: select,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 30 } },
  });
  const selected = filtered.filter((l) => sel[l.id]);
  return (
    <>
      <div className="toolbar">
        {[
          ["Importar planilha / Sync IA", Upload],
          ["Exportar planilha", Download],
          ["Template IA", FileSpreadsheet],
        ].map(([s, I]) => {
          const Icon = I as typeof Upload;
          return (
            <button key={String(s)} onClick={() => setMode(String(s))}>
              <Icon />
              {String(s)}
            </button>
          );
        })}
      </div>
      <section className="panel">
        <div className="filters">
          <label>
            <span className="icon-label">
              <SlidersHorizontal />
              Buscar
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => q(e.target.value)}
              placeholder="Empresa, contato ou endereço"
            />
          </label>
          {fq.map((k) => (
            <label key={k}>
              {labels[k]}
              <select
                value={filters[k] || ""}
                onChange={(e) => filt({ ...filters, [k]: e.target.value })}
              >
                <option value="">Todos</option>
                {[...new Set(list.map((l) => String(l[k])).filter(Boolean))]
                  .sort()
                  .map((x) => (
                    <option key={x}>{x}</option>
                  ))}
              </select>
            </label>
          ))}
        </div>
        {!!selected.length && (
          <div className="toolbar bulk">
            <b>{selected.length} selecionada(s)</b>
            <label className="compact">
              Mover para
              <select value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="">Estágio</option>
                {stages.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <button
              disabled={!stage}
              onClick={() =>
                syncRows(
                  selected.map((l) => ({
                    id: l.id,
                    estagio_funil: stage,
                    _expected: l.atualizado_em,
                  })),
                )
                  .then(() => select({}))
                  .catch(report)
              }
            >
              Aplicar
            </button>
            <button onClick={() => setMode("Remover empresas")}>
              <Trash2 />
              Remover
            </button>
          </div>
        )}
        <div className="scroll">
          <table>
            <thead>
              {table.getHeaderGroups().map((g) => (
                <tr key={g.id}>
                  {g.headers.map((h) => (
                    <th
                      key={h.id}
                      aria-sort={
                        h.column.getIsSorted() === "asc"
                          ? "ascending"
                          : h.column.getIsSorted() === "desc"
                            ? "descending"
                            : undefined
                      }
                    >
                      {h.column.getCanSort() ? (
                        <button onClick={h.column.getToggleSortingHandler()}>
                          {String(h.column.columnDef.header)}
                          {h.column.getIsSorted() === "asc" ? (
                            <ArrowUp />
                          ) : h.column.getIsSorted() === "desc" ? (
                            <ArrowDown />
                          ) : (
                            <ArrowUpDown />
                          )}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((c) => (
                    <td key={c.id}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <p>Nenhuma empresa encontrada.</p>}
        <div className="panel-head">
          <small>
            {filtered.length} empresas · Duplo clique ou Enter para editar
          </small>
          <div className="links">
            <button
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Anterior
            </button>
            <button
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Próxima
            </button>
          </div>
        </div>
      </section>
      {mode === "Remover empresas" ? (
        <Modal title={mode} close={() => setMode("")}>
          <p>Remover {selected.length} empresa(s) e seus checklists?</p>
          <div className="footer-actions">
            <button onClick={() => setMode("")}>Cancelar</button>
            <button
              onClick={() =>
                removeRows(selected.map((l) => l.id))
                  .then(() => {
                    select({});
                    setMode("");
                  })
                  .catch(report)
              }
            >
              Confirmar remoção
            </button>
          </div>
        </Modal>
      ) : (
        mode && (
          <Transfer
            mode={mode}
            close={() => setMode("")}
            list={list}
            filtered={filtered}
          />
        )
      )}
    </>
  );
}
