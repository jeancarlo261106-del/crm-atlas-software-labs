import { test, expect } from "@playwright/test";
import * as fs from "node:fs/promises";
import * as XLSX from "xlsx";
import { blank } from "../src/data";
test("reabre a base AtlasCRM anterior sem adicionar exemplos", async ({
  page,
}) => {
  await page.route("**/preparar-base", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Base anterior</title>",
    }),
  );
  await page.goto("/preparar-base");
  await page.evaluate(
    (lead) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("AtlasCRM", 10);
        req.onupgradeneeded = () => {
          const leads = req.result.createObjectStore("leads", {
            keyPath: "id",
          });
          for (const k of ["estagio_funil", "cidade", "nicho"])
            leads.createIndex(k, k);
          leads.add(lead);
        };
        req.onsuccess = () => {
          req.result.close();
          resolve();
        };
        req.onerror = () => reject(req.error);
      }),
    {
      ...blank(),
      empresa: "Cadastro anterior",
      cidade: "Recife",
      estagio_funil: "Fechado",
      checks: [3],
    },
  );
  await page.goto("/#projetos");
  await expect(
    page.getByRole("button", { name: "Cadastro anterior" }),
  ).toBeVisible();
  await expect(page.getByLabel("SSL ativo")).toBeChecked();
  await page.getByRole("link", { name: "Visão geral" }).click();
  await expect(page.locator(".metrics article").last()).toContainText("01");
});
test("importa arquivos XLSX e CSV e rejeita lote inválido sem gravar", async ({
  page: p,
}) => {
  await p.goto("/#empresas");
  const open = p.getByRole("button", { name: "Importar planilha / Sync IA" }),
    dlg = p.getByRole("dialog"),
    preview = dlg.getByRole("button", { name: "Gerar prévia" }),
    confirm = dlg.getByRole("button", { name: "Confirmar alterações" });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.json_to_sheet([
      { empresa: "Oficina Modelo", cidade: "Lajedo", valor_mrr: 120 },
    ]),
    "Base",
  );
  await open.click();
  await dlg.locator("[type=file]").setInputFiles({
    name: "empresas.xlsx",
    mimeType: "application/octet-stream",
    buffer: XLSX.write(book, { type: "buffer", bookType: "xlsx" }),
  });
  await preview.click();
  await confirm.click();
  await expect(p.locator("tbody")).toContainText("Oficina Modelo");
  await open.click();
  await dlg.locator("[type=file]").setInputFiles({
    name: "empresas.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "empresa,cidade,valor_projeto\nOficina Modelo,Lajedo,3210",
    ),
  });
  await preview.click();
  await expect(dlg.locator(".summary")).toContainText("Atualizar: 1");
  await confirm.click();
  await open.click();
  await dlg
    .locator("textarea")
    .fill(
      '[{"empresa":"Não adicionar","cidade":"Olinda"},{"empresa":"Inválida","cidade":"Recife","estagio_funil":"Outro"}]',
    );
  await preview.click();
  await expect(dlg.getByRole("alert")).toContainText("Registro 2");
  await dlg.getByLabel("Fechar", { exact: true }).click();
  await expect(p.locator("tbody")).not.toContainText("Não adicionar");
  await p.getByRole("link", { name: "Configurações" }).click();
  await p.getByLabel("Restaurar backup").setInputFiles({
    name: "invalido.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(p.getByText("Arquivo de backup incompatível.")).toBeVisible();
});
test("ciclo comercial, sincronização, backup e gravação offline", async ({
  page: p,
  context,
}) => {
  const errors: string[] = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("/");
  const btn = (name: string) => p.getByRole("button", { name, exact: true }),
    link = (name: string) => p.getByRole("link", { name, exact: true }),
    dlg = p.getByRole("dialog");
  await expect(p.locator(".metrics article").last()).toContainText("06");
  await p.getByLabel("Medida").selectOption("q");
  await p.getByLabel("Agrupar").selectOption("nicho");
  await p.locator(".action-row").first().click();
  await p.keyboard.press("Escape");
  await btn("Alternar navegação").click();
  await btn("Alternar navegação").click();
  await btn("Alternar tema").click();
  await p.reload();
  await expect(p.locator("html")).toHaveAttribute("data-theme", "light");
  await p.keyboard.press("Control+k");
  await dlg.getByLabel("Empresa", { exact: true }).fill("Teste Agreste");
  await dlg.getByLabel("Cidade", { exact: true }).fill("Lajedo");
  await dlg.getByLabel("WhatsApp").fill("87999999999");
  await dlg.getByLabel("URL do protótipo").fill("https://example.org/");
  await btn("Salvar empresa").click();
  await expect(p.locator(".metrics article").last()).toContainText("07");
  await link("Pipeline comercial").click();
  const card = p.locator(".kan-card").filter({ hasText: "Teste Agreste" }),
    source = card.getByRole("button", { name: "Arrastar Teste Agreste" });
  const target = p
    .locator(".column")
    .filter({ has: p.getByRole("heading", { name: "Protótipo Pronto" }) })
    .locator(".drop");
  const s = (await source.boundingBox())!,
    t = (await target.boundingBox())!;
  await p.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await p.mouse.down();
  await p.mouse.move(s.x + s.width / 2 - 10, s.y + s.height / 2, { steps: 3 });
  await p.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 14 });
  await expect(target).toHaveClass(/over/);
  await p.mouse.up();
  await expect(target).toContainText("Teste Agreste");
  await expect(card.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
    "href",
    "https://wa.me/5587999999999",
  );
  await link("Projetos e entregas").click();
  const project = p.locator(".panel").filter({ hasText: "Teste Agreste" });
  await project.getByLabel("SSL ativo").click();
  await expect(project.getByLabel("SSL ativo")).toBeChecked();
  await link("Planilha mestre").click();
  await p.getByLabel("Buscar").fill("Teste Agreste");
  await p.getByLabel("Estágio de Teste Agreste").selectOption("Fechado");
  await btn("Lajedo").dblclick();
  await p.locator(".inline-edit input").fill("Recife");
  await btn("Salvar").click();
  await expect(btn("Recife")).toBeVisible();
  await btn("Exportar planilha").click();
  await dlg.getByLabel("Empresas").selectOption("filtered");
  await dlg.getByLabel("Formato").selectOption("csv");
  const exported = p.waitForEvent("download");
  await btn("Baixar arquivo").click();
  const csv = await fs.readFile((await (await exported).path())!, "utf8");
  expect(csv).toContain("Teste Agreste");
  expect(csv).not.toContain("Odonto Serra");
  await btn("Template IA").click();
  const template = p.waitForEvent("download");
  await btn("Baixar template XLSX").click();
  const book = XLSX.read(await fs.readFile((await (await template).path())!));
  expect(XLSX.utils.sheet_to_csv(book.Sheets.Empresas)).toMatch(
    /^id,empresa,nicho/,
  );
  await btn("Fechar").click();
  await btn("Importar planilha / Sync IA").click();
  const upload = dlg.getByLabel("Ou cole CSV ou JSON");
  await upload.fill(
    '[{"empresa":"Teste Agreste","cidade":"Recife","valor_projeto":9800},{"empresa":"Novo registro","cidade":"Olinda"},{"empresa":"Odonto Serra","cidade":"Garanhuns","acao_sync":"remover"}]',
  );
  await btn("Gerar prévia").click();
  for (const op of ["Adicionar", "Atualizar", "Remover"])
    await expect(dlg.locator(".summary")).toContainText(`${op}: 1`);
  await btn("Confirmar alterações").click();
  await expect(p.locator("tbody")).toContainText("9.800,00");
  await link("Visão geral").click();
  await expect(p.locator(".metrics article").first()).toContainText(
    "16.300,00",
  );
  await link("Configurações").click();
  const backup = p.waitForEvent("download");
  await btn("Backup completo (.json)").click();
  const path = (await (await backup).path())!;
  await btn("Limpar dados de exemplo").click();
  await btn("Confirmar").click();
  await expect(p.locator(".settings").last()).toContainText("0 registros");
  await p.getByLabel("Restaurar backup").setInputFiles(path);
  await btn("Confirmar").click();
  await expect(p.locator(".settings").last()).toContainText("5 registros");
  await p.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await p.reload();
  await context.setOffline(true);
  await p.reload();
  await expect(p.getByText("Local DB ativo", { exact: true })).toBeVisible();
  await link("Projetos e entregas").click();
  await expect(project.getByLabel("SSL ativo")).toBeChecked();
  await project.getByLabel("Contrato assinado").click();
  await expect(project.getByLabel("Contrato assinado")).toBeChecked();
  await p.reload();
  await expect(project.getByLabel("Contrato assinado")).toBeChecked();
  expect(errors).toEqual([]);
});
test("navegação móvel, estados vazios e ação em lote", async ({ page: p }) => {
  await p.setViewportSize({ width: 375, height: 812 });
  await p.goto("/");
  const go = async (name: string) => {
    await p.getByRole("button", { name: "Alternar navegação" }).click();
    await p.getByRole("link", { name, exact: true }).click();
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  };
  await go("Planilha mestre");
  await p
    .getByRole("combobox", { name: "Cidade", exact: true })
    .selectOption("Caruaru");
  await p.getByLabel("Selecionar resultados").check();
  await p.getByLabel("Mover para").selectOption("Perdido");
  await p.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(p.locator("tbody select").first()).toHaveValue("Perdido");
  await p.getByLabel("Selecionar resultados").check();
  await p.getByRole("button", { name: "Remover", exact: true }).click();
  await p.getByRole("button", { name: "Confirmar remoção" }).click();
  await expect(p.getByText("Nenhuma empresa encontrada.")).toBeVisible();
  await go("Configurações");
  await p.getByRole("button", { name: "Limpar dados de exemplo" }).click();
  await p.getByRole("button", { name: "Confirmar", exact: true }).click();
  await go("Visão geral");
  await expect(p.getByText("Nenhum retorno agendado para hoje.")).toBeVisible();
  await go("Pipeline comercial");
  await go("Projetos e entregas");
});
