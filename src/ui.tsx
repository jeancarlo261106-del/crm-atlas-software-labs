import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, ExternalLink, MessageSquare } from "lucide-react";
import { createLead, update } from "./services/leadsLocal";
import { toast } from "sonner";
import {
  blank,
  changed,
  digital,
  digitsLink,
  fields,
  labels,
  stages,
  type Field,
  type Lead,
} from "./data";
export const report = (e: unknown) =>
  toast.error(
    e instanceof Error ? e.message : "Não foi possível concluir a operação.",
  );
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="panel-head">
        <h2>{title}</h2>
        <button className="icon" onClick={close} aria-label="Fechar">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Links({ l }: { l: Lead }) {
  return (
    <span className="links">
      {l.whatsapp && (
        <a
          aria-label={`WhatsApp de ${l.empresa}`}
          href={digitsLink(l.whatsapp)}
          target="_blank"
          rel="noreferrer"
        >
          <MessageSquare />
        </a>
      )}
      {l.url_prototipo && (
        <a
          aria-label={`Protótipo de ${l.empresa}`}
          href={l.url_prototipo}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink />
        </a>
      )}
    </span>
  );
}
export const editable = fields.filter(
  (k) => !["id", "acao_sync", "atualizado_em"].includes(k),
);
export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string | number;
  onChange: (v: string | number) => void;
}) {
  const options =
    field === "estagio_funil"
      ? stages
      : field === "status_digital_atual"
        ? digital
        : null;
  if (options)
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    );
  if (field === "notas")
    return (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} />
    );
  const numeric = field.startsWith("valor_");
  return (
    <input
      type={numeric ? "number" : field === "url_prototipo" ? "url" : "text"}
      min={numeric ? 0 : undefined}
      step={numeric ? "0.01" : undefined}
      required={["empresa", "cidade"].includes(field)}
      placeholder={
        field === "proxima_acao" ? "AAAA-MM-DD e lembrete" : undefined
      }
      value={value}
      onChange={(e) =>
        onChange(numeric ? Number(e.target.value) : e.target.value)
      }
    />
  );
}
export function CompanyForm({
  lead,
  close,
}: {
  lead?: Lead;
  close: () => void;
}) {
  const [l, set] = useState(() => lead || blank()),
    [error, err] = useState("");
  return (
    <Modal title={lead ? "Editar empresa" : "Nova empresa"} close={close}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            if (lead) {
              const patch = Object.fromEntries(
                editable.filter((k) => l[k] !== lead[k]).map((k) => [k, l[k]]),
              );
              await update(l.id, patch);
            } else await createLead(changed(l, {}));
            toast.success("Empresa salva.");
            close();
          } catch (e) {
            err((e as Error).message);
          }
        }}
      >
        <div className="form-grid">
          {editable.map((k) => (
            <label key={k}>
              {labels[k]}
              <FieldInput
                field={k}
                value={l[k]}
                onChange={(v) => set({ ...l, [k]: v })}
              />
            </label>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="footer-actions">
          <button type="button" onClick={close}>
            Cancelar
          </button>
          <button className="primary">Salvar empresa</button>
        </div>
      </form>
    </Modal>
  );
}
