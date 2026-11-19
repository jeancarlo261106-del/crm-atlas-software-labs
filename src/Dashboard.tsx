import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Banknote,
  Repeat2,
  Layers3,
  Target,
  Building2,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  ChartNoAxesColumn,
} from "lucide-react";
import { dateKey, money, stages, type Lead } from "./data";
export function Dashboard({
  list,
  edit,
}: {
  list: Lead[];
  edit: (l: Lead) => void;
}) {
  const [dim, setDim] = useState<"cidade" | "nicho">("cidade"),
    [count, setCount] = useState(false);
  const won = list.filter((l) => l.estagio_funil === "Fechado"),
    open = list.filter(
      (l) => !["Fechado", "Perdido"].includes(l.estagio_funil),
    ),
    today = dateKey();
  const sum = (a: Lead[]) => a.reduce((v, l) => v + l.valor_projeto, 0);
  const kpis = [
    {
      title: "Receita fechada",
      value: money(
        sum(won.filter((l) => l.closed.startsWith(today.slice(0, 7)))),
      ),
      note: "Mês atual",
      Icon: Banknote,
    },
    {
      title: "MRR ativo",
      value: money(won.reduce((n, l) => n + l.valor_mrr, 0)),
      note: "Receita mensal recorrente",
      Icon: Repeat2,
    },
    {
      title: "Valor em pipeline",
      value: money(sum(open)),
      note: `${open.length} em negociação`,
      Icon: Layers3,
    },
    {
      title: "Taxa de conversão",
      value: `${(list.length ? (won.length / list.length) * 100 : 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
      note: "Fechadas / mapeadas",
      Icon: Target,
    },
    {
      title: "Empresas mapeadas",
      value: String(list.length).padStart(2, "0"),
      note: "Base completa",
      Icon: Building2,
    },
  ];
  const data = Object.entries(
    list.reduce<Record<string, number>>((r, l) => {
      const k = l[dim] || "Não informado";
      r[k] = (r[k] || 0) + 1;
      return r;
    }, Object.create(null)),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const palette = [
    "#f97316",
    "#8898af",
    "#c8d2df",
    "#ba865f",
    "#6d8d96",
    "#a8a095",
  ];
  const bars = stages.map((s) => {
      const rows = list.filter((l) => l.estagio_funil === s);
      return count ? rows.length : sum(rows);
    }),
    max = Math.max(1, ...bars),
    actions = list.filter((l) => l.proxima_acao.startsWith(today));
  return (
    <>
      <section className="metrics">
        {kpis.map(({ title, Icon, value, note }) => (
          <article key={title}>
            <div>
              <Icon />
              {title}
            </div>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <div className="charts">
        <section className="panel">
          <div className="panel-head">
            <h2>
              <ChartNoAxesColumn />
              Funil comercial
            </h2>
            <label className="compact">
              Medida
              <select
                value={count ? "q" : "v"}
                onChange={(e) => setCount(e.target.value === "q")}
              >
                <option value="v">Valor</option>
                <option value="q">Quantidade</option>
              </select>
            </label>
          </div>
          <div className="bars">
            {stages.map((s, i) => (
              <div className="bar-row" key={s}>
                <span>{s}</span>
                <div className="track">
                  <i style={{ width: `${(bars[i] / max) * 100}%` }} />
                </div>
                <b>{count ? bars[i] : money(bars[i])}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>
              <MapPin />
              Distribuição
            </h2>
            <label className="compact">
              Agrupar
              <select
                value={dim}
                onChange={(e) => setDim(e.target.value as typeof dim)}
              >
                <option value="cidade">Cidade</option>
                <option value="nicho">Nicho</option>
              </select>
            </label>
          </div>
          {list.length ? (
            <>
              <div className="donut">
                <ResponsiveContainer width="100%" height={165}>
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={72}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={2}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {data.map((r, i) => (
                        <Cell key={r.name} fill={palette[i % palette.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div>
                  <strong>{list.length}</strong>
                  <small>empresas</small>
                </div>
              </div>
              <div className="legend">
                {data.map((r, i) => (
                  <div key={r.name}>
                    <i style={{ background: palette[i % palette.length] }} />
                    {r.name}
                    <b>{r.value}</b>
                    <small>{Math.round((100 * r.value) / list.length)}%</small>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>Sem empresas mapeadas.</p>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>
            <CalendarDays />
            Ações de hoje <small>{actions.length}</small>
          </h2>
          <small>
            {new Date().toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
            })}
          </small>
        </div>
        {actions.length ? (
          actions.map((l) => (
            <button className="action-row" key={l.id} onClick={() => edit(l)}>
              <span>
                <strong>{l.empresa}</strong>
                <small>
                  {l.proxima_acao.slice(10).trim() || "Retorno agendado"}
                </small>
              </span>
              <span className="action-city">{l.cidade}</span>
              <span className="tag">{l.estagio_funil}</span>
              <ArrowUpRight />
            </button>
          ))
        ) : (
          <p>Nenhum retorno agendado para hoje.</p>
        )}
      </section>
    </>
  );
}
