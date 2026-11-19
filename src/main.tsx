import {
  useEffect,
  useState,
  Component,
  lazy,
  Suspense,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { useLeads } from "./services/leadsLocal";
import { Toaster } from "sonner";
import {
  LayoutDashboard,
  Table2,
  Kanban,
  FolderGit2,
  Settings as Gear,
  PanelLeftOpen,
  PanelLeftClose,
  Sun,
  Moon,
  Plus,
  Database,
  ChevronRight,
  CalendarDays,
  CircleCheck,
  CircleAlert,
  Info,
  TriangleAlert,
  LoaderCircle,
  X,
} from "lucide-react";
import { Dashboard } from "./Dashboard";
import { CompanyForm } from "./ui";
import { type Lead } from "./data";
import "../styles.css";
const Sheet = lazy(() => import("./Sheet").then((m) => ({ default: m.Sheet })));
const Pipeline = lazy(() =>
  import("./Operations").then((m) => ({ default: m.Pipeline })),
);
const Projects = lazy(() =>
  import("./Operations").then((m) => ({ default: m.Projects })),
);
const Settings = lazy(() =>
  import("./Operations").then((m) => ({ default: m.Settings })),
);
const pages = [
  {
    id: "dashboard",
    title: "Visão geral",
    desc: "Indicadores comerciais e retornos agendados.",
    icon: LayoutDashboard,
  },
  {
    id: "empresas",
    title: "Planilha mestre",
    desc: "Consulte, edite e sincronize as empresas mapeadas.",
    icon: Table2,
  },
  {
    id: "pipeline",
    title: "Pipeline comercial",
    desc: "Arraste as empresas entre estágios ou abra o cadastro para movê-las.",
    icon: Kanban,
  },
  {
    id: "projetos",
    title: "Projetos e entregas",
    desc: "Acompanhe os itens técnicos e financeiros de cada entrega.",
    icon: FolderGit2,
  },
  {
    id: "configuracoes",
    title: "Configurações",
    desc: "Gerencie os dados armazenados neste navegador.",
    icon: Gear,
  },
];
function App() {
  const { list, status } = useLeads();
  const [route, nav] = useState(location.hash.slice(1)),
    [small, collapse] = useState(false),
    [menu, showMenu] = useState(false),
    [theme, setTheme] = useState(
      localStorage.getItem("atlas-theme") === "light" ? "light" : "dark",
    ),
    [form, setForm] = useState<Lead | "new" | null>(null);
  const page = pages.find((p) => p.id === route) || pages[0];
  useEffect(() => {
    const route = () => {
        nav(location.hash.slice(1));
        showMenu(false);
      },
      keys = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          if (!document.querySelector("dialog[open]")) setForm("new");
        }
        if (e.key === "Escape") showMenu(false);
      };
    window.addEventListener("hashchange", route);
    window.addEventListener("keydown", keys);
    return () => {
      window.removeEventListener("hashchange", route);
      window.removeEventListener("keydown", keys);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("atlas-theme", theme);
  }, [theme]);
  useEffect(() => {
    document.title = `${page.title} | Atlas CRM`;
  }, [page]);
  const navItem = (p: typeof page) => (
    <a
      key={p.id}
      aria-label={p.title}
      aria-current={page === p ? "page" : undefined}
      title={p.title}
      href={`#${p.id}`}
      onClick={() => showMenu(false)}
    >
      <p.icon />
      <span>{p.title}</span>
    </a>
  );
  return (
    <div
      className={`app ${small ? "collapsed" : ""} ${menu ? "menu-open" : ""}`}
    >
      <aside>
        <div className="brand">
          <b>
            Atlas<span> CRM</span>
          </b>
          <small>Atlas Software Labs</small>
        </div>
        <nav aria-label="Área de trabalho">
          <small>Área de trabalho</small>
          {pages.slice(0, 4).map(navItem)}
        </nav>
        <div className="aside-bottom">
          <nav>{navItem(pages[4])}</nav>
          <button
            title="Alternar tema"
            aria-label="Alternar tema"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
            <span>Modo {theme === "dark" ? "claro" : "escuro"}</span>
          </button>
          <footer
            data-status={status}
            role="status"
            aria-label={list ? "Local DB ativo" : "Abrindo base local"}
          >
            <Database />
            <span>{list ? "Local DB ativo" : "Abrindo base…"}</span>
          </footer>
        </div>
      </aside>
      {menu && (
        <button
          aria-label="Fechar navegação"
          className="scrim"
          onClick={() => showMenu(false)}
        />
      )}
      <div className="workspace">
        <header>
          <div className="flex items-center gap-3">
            <button
              className="icon"
              aria-label="Alternar navegação"
              onClick={() =>
                window.matchMedia("(max-width: 700px)").matches
                  ? showMenu(!menu)
                  : collapse(!small)
              }
            >
              {small ? (
                <PanelLeftOpen className="desktop-toggle" />
              ) : (
                <PanelLeftClose className="desktop-toggle" />
              )}
              {menu ? (
                <PanelLeftClose className="mobile-toggle" />
              ) : (
                <PanelLeftOpen className="mobile-toggle" />
              )}
            </button>
            <span className="crumb">Área de trabalho</span>
            <ChevronRight />
            {page.title}
          </div>
          <button className="primary" onClick={() => setForm("new")}>
            <Plus />
            Nova empresa <kbd>Ctrl K</kbd>
          </button>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <h1>{page.title}</h1>
              <p>
                {page.desc}
                {page.id === "dashboard" &&
                list?.length &&
                list.every((l) => l.demo)
                  ? " Exibindo a base de exemplo."
                  : ""}
              </p>
            </div>
            {page === pages[0] && (
              <span className="date">
                <CalendarDays />
                {new Date().toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
          <Suspense fallback={<p role="status">Abrindo módulo…</p>}>
            {!list ? (
              <p role="status">Abrindo base local…</p>
            ) : page.id === "dashboard" ? (
              <Dashboard list={list} edit={setForm} />
            ) : page.id === "empresas" ? (
              <Sheet list={list} edit={setForm} />
            ) : page.id === "pipeline" ? (
              <Pipeline list={list} edit={setForm} />
            ) : page.id === "projetos" ? (
              <Projects list={list} edit={setForm} />
            ) : (
              <Settings list={list} />
            )}
          </Suspense>
        </main>
      </div>
      {form && (
        <CompanyForm
          lead={form === "new" ? undefined : form}
          close={() => setForm(null)}
        />
      )}
      <Toaster
        theme={theme as "dark" | "light"}
        position="bottom-right"
        icons={{
          success: <CircleCheck />,
          error: <CircleAlert />,
          info: <Info />,
          warning: <TriangleAlert />,
          loading: <LoaderCircle />,
          close: <X />,
        }}
      />
    </div>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main>
        <h1>Não foi possível abrir o CRM</h1>
        <p>Recarregue a página para tentar novamente.</p>
        <button onClick={() => location.reload()}>Tentar novamente</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <Boundary>
    <App />
  </Boundary>,
);
