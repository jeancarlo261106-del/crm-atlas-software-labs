export const stages = [
  "Prospecção",
  "Protótipo Pronto",
  "Abordado",
  "Call/Reunião",
  "Proposta Enviada",
  "Fechado",
  "Perdido",
] as const;
export const digital = [
  "Sem Site",
  "Linktree/Instagram",
  "Site Lento/Antigo",
  "Sistema Manual",
] as const;
export const tasks = [
  "Domínio configurado",
  "Repositório Git",
  "Deploy em produção",
  "SSL ativo",
  "Contrato assinado",
  "Pagamento 50% entrada",
  "Pagamento 50% entrega",
];
export const fields = [
  "id",
  "empresa",
  "nicho",
  "cidade",
  "endereco",
  "decisor",
  "whatsapp",
  "status_digital_atual",
  "url_prototipo",
  "estagio_funil",
  "valor_projeto",
  "valor_mrr",
  "proxima_acao",
  "notas",
  "acao_sync",
  "atualizado_em",
] as const;
export type Field = (typeof fields)[number];
export const labels: Record<Field, string> = {
  id: "ID",
  empresa: "Empresa",
  nicho: "Nicho",
  cidade: "Cidade",
  endereco: "Endereço",
  decisor: "Decisor",
  whatsapp: "WhatsApp",
  status_digital_atual: "Status digital",
  url_prototipo: "URL do protótipo",
  estagio_funil: "Estágio",
  valor_projeto: "Valor do projeto",
  valor_mrr: "Mensalidade",
  proxima_acao: "Próxima ação",
  notas: "Notas",
  acao_sync: "Ação de sync",
  atualizado_em: "Atualizado em",
};
export type Lead = Record<
  Exclude<Field, "valor_projeto" | "valor_mrr">,
  string
> & {
  valor_projeto: number;
  valor_mrr: number;
  demo: boolean;
  checks: number[];
  closed: string;
};
export const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function blank(): Lead {
  return {
    id: crypto.randomUUID(),
    empresa: "",
    nicho: "",
    cidade: "",
    endereco: "",
    decisor: "",
    whatsapp: "",
    status_digital_atual: digital[0],
    url_prototipo: "",
    estagio_funil: stages[0],
    valor_projeto: 2000,
    valor_mrr: 0,
    proxima_acao: "",
    notas: "",
    acao_sync: "ativo",
    atualizado_em: new Date().toISOString(),
    demo: false,
    checks: [],
    closed: "",
  };
}
export function validate(l: Lead) {
  if (!l.empresa.trim() || !l.cidade.trim())
    throw Error("Informe empresa e cidade.");
  if (
    !stages.some((s) => s === l.estagio_funil) ||
    !digital.some((s) => s === l.status_digital_atual)
  )
    throw Error("Estágio ou status digital inválido.");
  if ([l.valor_projeto, l.valor_mrr].some((n) => !Number.isFinite(n) || n < 0))
    throw Error("Informe valores monetários não negativos.");
  if (
    l.url_prototipo &&
    !/^https?:\/\/[^/\s]+(?:[/?#]\S*)?$/i.test(l.url_prototipo)
  )
    throw Error("Use um link de protótipo HTTP ou HTTPS.");
  if (l.whatsapp && !/^\d{10,15}$/.test(l.whatsapp))
    throw Error("WhatsApp: use apenas números, incluindo o DDD.");
}
export function changed(old: Lead, patch: Partial<Lead>): Lead {
  const l = { ...old, ...patch, atualizado_em: new Date().toISOString() };
  validate(l);
  l.closed = l.estagio_funil === "Fechado" ? old.closed || dateKey() : "";
  return l;
}
export const digitsLink = (s: string) =>
  `https://wa.me/${s.length <= 11 ? "55" : ""}${s}`;
