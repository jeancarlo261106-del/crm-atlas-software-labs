import { useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  pointerWithin,
  closestCenter,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  GripVertical,
  DatabaseBackup,
  RotateCcw,
  Columns3,
  Trash2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { stages, tasks, money, type Lead } from "./data";
import { removeRows, restore, update } from "./services/leadsLocal";
import { Links, Modal, report } from "./ui";
import { readBackup, download } from "./sync";
type Props = { list: Lead[]; edit: (l: Lead) => void };
function Card({ l, edit }: { l: Lead; edit: Props["edit"] }) {
  const drag = useDraggable({ id: l.id });
  return (
    <article
      ref={drag.setNodeRef}
      className="kan-card"
      style={{
        transform: drag.transform
          ? `translate(${drag.transform.x}px,${drag.transform.y}px)`
          : undefined,
        zIndex: drag.isDragging ? 3 : undefined,
      }}
    >
      <div className="between">
        <button className="text-btn" onClick={() => edit(l)}>
          {l.empresa}
        </button>
        <button
          className="grip"
          {...drag.attributes}
          {...drag.listeners}
          aria-label={`Arrastar ${l.empresa}`}
        >
          <GripVertical />
        </button>
      </div>
      <small>
        <MapPin />
        {l.cidade} · {l.nicho}
      </small>
      <div className="between">
        <b>{money(l.valor_projeto)}</b>
        <Links l={l} />
      </div>
    </article>
  );
}
function Column({
  s,
  rows,
  edit,
  move,
  first,
  last,
}: {
  s: string;
  rows: Lead[];
  edit: Props["edit"];
  move: (n: number) => void;
  first: boolean;
  last: boolean;
}) {
  const sort = useSortable({ id: `col:${s}` }),
    drop = useDroppable({ id: s });
  return (
    <section
      ref={sort.setNodeRef}
      className="column"
      style={{
        transform: sort.transform
          ? `translateX(${sort.transform.x}px)`
          : undefined,
      }}
    >
      <div className="between">
        <h2>{s}</h2>
        <button
          {...sort.attributes}
          {...sort.listeners}
          className="grip"
          aria-label={`Ordenar coluna ${s}`}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" && !first) move(-1);
            if (e.key === "ArrowRight" && !last) move(1);
          }}
          title="Arraste ou use as setas para reordenar"
        >
          <Columns3 />
        </button>
      </div>
      <small>
        {rows.length} empresas ·{" "}
        {money(rows.reduce((n, l) => n + l.valor_projeto, 0))}
      </small>
      <div
        ref={drop.setNodeRef}
        className={`drop ${drop.isOver ? "over" : ""}`}
      >
        {rows.map((l) => (
          <Card key={l.id} l={l} edit={edit} />
        ))}
        {!rows.length && <small>Nenhuma empresa neste estágio.</small>}
      </div>
    </section>
  );
}
export function Pipeline({ list, edit }: Props) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const o = JSON.parse(localStorage.getItem("atlas-columns") || "[]");
      if (
        Array.isArray(o) &&
        o.length === 7 &&
        stages.every((s) => o.includes(s))
      )
        return o;
    } catch {}
    return [...stages];
  });
  const move = (a: number, b: number) => {
    const o = arrayMove(order, a, b);
    setOrder(o);
    localStorage.setItem("atlas-columns", JSON.stringify(o));
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const collisions: CollisionDetection = (args) => {
    const col = String(args.active.id).startsWith("col:");
    const containers = args.droppableContainers.filter(
      (d) => String(d.id).startsWith("col:") === col,
    );
    return (col ? closestCenter : pointerWithin)({
      ...args,
      droppableContainers: containers,
    });
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisions}
      onDragEnd={({ active, over }) => {
        if (!over) return;
        const a = String(active.id),
          b = String(over.id);
        if (a.startsWith("col:"))
          move(order.indexOf(a.slice(4)), order.indexOf(b.slice(4)));
        else update(a, { estagio_funil: b }).catch(report);
      }}
    >
      <SortableContext
        items={order.map((s) => `col:${s}`)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="board">
          {order.map((s, i) => (
            <Column
              key={s}
              s={s}
              rows={list.filter((l) => l.estagio_funil === s)}
              edit={edit}
              first={!i}
              last={i === 6}
              move={(n) => move(i, i + n)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
export function Projects({ list, edit }: Props) {
  const rows = list.filter((l) =>
    ["Fechado", "Protótipo Pronto"].includes(l.estagio_funil),
  );
  return (
    <div className="projects">
      {rows.map((l) => (
        <section key={l.id} className="panel">
          <div className="panel-head">
            <div>
              <small>{l.estagio_funil}</small>
              <h2>
                <button className="text-btn" onClick={() => edit(l)}>
                  {l.empresa}
                </button>
              </h2>
            </div>
            <b>
              {l.checks.length}/{tasks.length}
            </b>
          </div>
          <div className="tasks">
            {tasks.map((t, i) => (
              <label key={t}>
                <input
                  type="checkbox"
                  checked={l.checks.includes(i)}
                  onChange={(e) => {
                    const on = e.target.checked;
                    update(l.id, {
                      checks: on
                        ? [...new Set([...l.checks, i])]
                        : l.checks.filter((n) => n !== i),
                    }).catch(report);
                  }}
                />
                {t}
              </label>
            ))}
          </div>
        </section>
      ))}
      {!rows.length && (
        <p>Empresas fechadas ou com protótipo pronto aparecem aqui.</p>
      )}
    </div>
  );
}
export function Settings({ list }: { list: Lead[] }) {
  const [pending, set] = useState<Lead[] | null>(null),
    [clean, ask] = useState(false);
  const demos = list.filter((l) => l.demo);
  return (
    <>
      <section className="panel settings">
        <h2>Backup da base</h2>
        <p>
          O backup inclui todas as empresas, as datas de fechamento e os
          checklists de entrega.
        </p>
        <button
          onClick={() =>
            download(
              "atlas-backup.json",
              JSON.stringify(
                { app: "Atlas CRM", version: 1, empresas: list },
                null,
                2,
              ),
              "application/json",
            )
          }
        >
          <DatabaseBackup />
          Backup completo (.json)
        </button>
        <label>
          <span className="icon-label">
            <RotateCcw />
            Restaurar backup
          </span>
          <input
            type="file"
            accept=".json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f)
                try {
                  set(readBackup(await f.text()));
                } catch (e) {
                  report(e);
                }
            }}
          />
        </label>
      </section>
      <section className="panel settings">
        <h2>Empresas de exemplo</h2>
        <p>{demos.length} registros fictícios na base.</p>
        <button disabled={!demos.length} onClick={() => ask(true)}>
          <Trash2 />
          Limpar dados de exemplo
        </button>
      </section>
      {(clean || pending !== null) && (
        <Modal
          title={clean ? "Limpar exemplos" : "Restaurar backup"}
          close={() => {
            set(null);
            ask(false);
          }}
        >
          <p>
            {clean
              ? `Remover as ${demos.length} empresas de exemplo?`
              : `Substituir a base atual por ${pending?.length} empresas do backup?`}
          </p>
          <div className="footer-actions">
            <button
              onClick={() => {
                ask(false);
                set(null);
              }}
            >
              Cancelar
            </button>
            <button
              className="primary"
              onClick={async () => {
                try {
                  if (clean) await removeRows(demos.map((l) => l.id));
                  else if (pending) await restore(pending);
                  ask(false);
                  set(null);
                  toast.success("Base atualizada.");
                } catch (e) {
                  report(e);
                }
              }}
            >
              Confirmar
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
