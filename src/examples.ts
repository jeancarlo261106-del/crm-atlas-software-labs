import { blank, dateKey, digital, stages, type Lead } from "./data";
const examples: [string, string, string, number, number, string][] = [
  [
    "Odonto Serra",
    "Odontologia",
    "Garanhuns",
    4,
    4800,
    "Retomar proposta com a clínica",
  ],
  [
    "Agreste Auto Center",
    "Oficina mecânica",
    "Caruaru",
    2,
    3200,
    "Ligar para o gerente",
  ],
  ["Lima & Paiva Advocacia", "Advocacia", "Garanhuns", 5, 6500, ""],
  [
    "Distribuidora Sete Colinas",
    "Distribuidora",
    "Garanhuns",
    1,
    8400,
    "Apresentar protótipo",
  ],
  ["Casa do Retalho", "Varejo", "Caruaru", 0, 2400, ""],
  ["Studio Alto do Moura", "Arquitetura", "Caruaru", 3, 5600, ""],
];
export const exampleLeads = (): Lead[] =>
  examples.map(([empresa, nicho, cidade, i, v, acao], idx) => ({
    ...blank(),
    closed: i === 5 ? dateKey() : "",
    empresa,
    nicho,
    cidade,
    estagio_funil: stages[Number(i)],
    valor_projeto: v,
    valor_mrr: i === 5 ? 390 : 0,
    status_digital_atual: digital[idx % 4],
    notas: acao,
    proxima_acao: acao ? `${dateKey()} ${acao}` : "",
    demo: true,
  }));
