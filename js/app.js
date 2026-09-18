(function () {
  const FSY = window.FSY;
  const PAGE_SIZE = 50;
  const ARCH_SVG =
    '<svg class="arch" viewBox="0 0 90 110" aria-hidden="true"><path d="M12 108 V52 A33 33 0 0 1 78 52 V108" fill="none" stroke="currentColor" stroke-width="4"/><path d="M28 108 V64 A17 17 0 0 1 62 64 V108" fill="none" stroke="#dbbf6b" stroke-width="3"/><rect x="41" y="78" width="8" height="16" rx="1" fill="#007da5"/></svg>';

  const ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a3 3 0 0 1 0 5.75"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21V4h9l1 3h6v10h-7l-1-3H6v7z"/></svg>',
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18V8h8a5 5 0 0 1 5 5v5"/><path d="M3 14h18"/><path d="M21 18V13"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13"/></svg>',
    wa: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 12a8 8 0 0 1-11.7 7.1L4 20l1-4.2A8 8 0 1 1 20 12zm-3.1 2.7c.2.5-.1.8-.4 1-1.3.6-3.3-.1-5.2-2-1.8-1.8-2.6-3.7-2-5 .2-.4.5-.6 1-.4l1 .5c.3.1.4.4.3.7l-.4 1.1c-.1.2 0 .5.2.6l1.2 1.2c.2.2.4.3.6.2l1.1-.4c.3-.1.6 0 .7.3z"/></svg>',
  };

  const state = {
    route: "welcome",
    params: {},
    loading: 0,
    toastTimer: null,
    participantes: [],
    usuarios: [],
    filters: { q: "", companhia: "", estaca: "", sort: "nome", page: 1 },
    userFilters: { status: "todos", perfil: "todos" },
    importRows: [],
    logoClicks: 0,
  };

  const root = document.getElementById("app");

  function setLoading(on) {
    state.loading += on ? 1 : -1;
    if (state.loading < 0) state.loading = 0;
    const el = document.getElementById("spinner");
    if (el) el.classList.toggle("hidden", state.loading === 0);
  }

  async function withLoading(fn) {
    setLoading(true);
    try {
      return await fn();
    } finally {
      setLoading(false);
    }
  }

  function toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.classList.remove("hidden");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      el.classList.add("hidden");
    }, 3200);
  }

  function parseHash() {
    const raw = (location.hash || "#/welcome").replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean);
    const name = parts[0] || "welcome";
    const params = {};
    if (name === "participantes" && parts[1] === "editar") params.id = parts[2];
    if (name === "participantes" && parts[1] === "novo") params.mode = "novo";
    return { name, params };
  }

  function go(path) {
    location.hash = "#/" + path.replace(/^#\/?/, "");
  }

  function requireSession() {
    const session = FSY.getSession();
    if (!session) {
      go("welcome");
      return null;
    }
    return session;
  }

  function requireLideranca() {
    const session = requireSession();
    if (!session) return null;
    if (!FSY.isLideranca(session)) {
      go("inicio");
      return null;
    }
    return session;
  }

  function navItems(session) {
    if (FSY.isLideranca(session)) {
      return [
        { href: "inicio", label: "Início", icon: ICONS.home },
        { href: "participantes", label: "Participantes", icon: ICONS.people },
        { href: "companhias", label: "Companhias", icon: ICONS.flag },
        { href: "quartos", label: "Quartos", icon: ICONS.bed },
        { href: "usuarios", label: "Usuários", icon: ICONS.user },
        { href: "participantes/novo", label: "Adicionar", icon: ICONS.plus },
      ];
    }
    return [
      { href: "inicio", label: "Minha Companhia", icon: ICONS.home },
      { href: "buscar", label: "Buscar", icon: ICONS.search },
    ];
  }

  function navIsActive(href) {
    const current = (location.hash || "").replace(/^#\/?/, "");
    if (href === "participantes/novo") return current === "participantes/novo";
    if (href === "participantes") {
      return current === "participantes" || current.indexOf("participantes/editar/") === 0;
    }
    return current === href || current.indexOf(href + "/") === 0;
  }

  function shell(session, inner) {
    const items = navItems(session)
      .map(function (item) {
        const isActive = navIsActive(item.href);
        return (
          '<a class="nav-item' +
          (isActive ? " active" : "") +
          '" href="#/' +
          item.href +
          '">' +
          item.icon +
          "<span>" +
          item.label +
          "</span></a>"
        );
      })
      .join("");
    return (
      '<div class="shell">' +
      '<header class="topbar">' +
      '<div class="topbar-brand">FSY 2027</div>' +
      '<div class="topbar-user"><span class="desktop-only">' +
      FSY.esc(session.nome) +
      "</span>" +
      '<button class="btn-sair" data-action="logout">Sair</button></div></header>' +
      '<nav class="bottom-nav">' +
      items +
      "</nav>" +
      '<main class="content">' +
      inner +
      "</main></div>"
    );
  }

  function authLayout(inner) {
    return '<div class="auth-wrap"><div class="auth-card">' + inner + "</div></div>";
  }

  function googleButton() {
    return (
      '<button class="btn btn-google btn-block" type="button" data-action="login-google">' +
      '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96L3.97 7.29C4.68 5.16 6.66 3.58 9 3.58z"/></svg>' +
      "Entrar com Gmail</button>"
    );
  }

  function viewWelcome() {
    return authLayout(
      ARCH_SVG +
        '<p class="kicker">Filipenses 4:4</p>' +
        '<h1 class="brand-title" data-action="logo-secret">Regozijai-vos em Cristo</h1>' +
        '<p class="scripture">FSY 2027 — Gestão de Participantes</p>' +
        '<hr class="gold-rule"/>' +
        (FSY.hasConfig() ? "" : '<div class="alert">Antes de entrar, configure a conexão com o Supabase.</div>') +
        '<div class="stack">' +
        googleButton() +
        '<p class="auth-or">ou</p>' +
        '<button class="btn btn-primary btn-block" data-action="go" data-to="' +
        (FSY.hasConfig() ? "login" : "setup") +
        '">Entrar com e-mail</button>' +
        '<button class="btn btn-outline btn-block" data-action="go" data-to="' +
        (FSY.hasConfig() ? "cadastro" : "setup") +
        '">Criar conta</button>' +
        '<p class="center muted"><button class="linkish" data-action="go" data-to="setup">Configurar conexão</button></p>' +
        '<p class="center muted">Para o Gmail funcionar, deixe a janela <strong>iniciar-fsy.bat</strong> aberta.</p>' +
        "</div>"
    );
  }

  function viewLogin() {
    return authLayout(
      ARCH_SVG +
        '<h1 class="brand-title">Entrar</h1>' +
        '<p class="brand-sub">Use o e-mail aprovado pela liderança.</p>' +
        '<hr class="gold-rule"/>' +
        '<form class="stack" data-form="login">' +
        field("email", "E-mail", "email", true) +
        field("senha", "Senha", "password", true) +
        '<button class="btn btn-primary btn-block" type="submit">Entrar</button>' +
        '<p class="auth-or">ou</p>' +
        googleButton() +
        "</form>" +
        '<p class="center muted" style="margin-top:16px">Ainda não tem conta? <button class="linkish" data-action="go" data-to="cadastro">Criar conta</button></p>'
    );
  }

  function viewCadastro() {
    return authLayout(
      ARCH_SVG +
        '<h1 class="brand-title">Criar conta</h1>' +
        '<p class="brand-sub">Consultores aguardam aprovação. Quem a administradora autorizar como liderança entra automaticamente.</p>' +
        '<hr class="gold-rule"/>' +
        '<form class="stack" data-form="cadastro">' +
        field("nome", "Nome completo", "text", true) +
        field("email", "E-mail", "email", true) +
        field("senha", "Senha (mínimo 6 caracteres)", "password", true) +
        field("confirma", "Confirmar senha", "password", true) +
        '<button class="btn btn-primary btn-block" type="submit">Solicitar acesso</button>' +
        '<p class="auth-or">ou</p>' +
        googleButton() +
        "</form>" +
        '<p class="center muted" style="margin-top:16px"><button class="linkish" data-action="go" data-to="login">Já tenho conta</button></p>'
    );
  }

  function viewSetup() {
    const cfg = FSY.getConfig();
    return authLayout(
      '<h1 class="brand-title">Setup inicial</h1>' +
        '<p class="brand-sub">Cole a URL e a chave anon do projeto Supabase. Depois execute o SQL no painel.</p>' +
        '<hr class="gold-rule"/>' +
        '<form class="stack" data-form="setup">' +
        field("url", "Project URL", "url", true, cfg.url) +
        '<label class="field"><span>Anon public key</span><textarea name="anonKey" required>' +
        FSY.esc(cfg.anonKey) +
        "</textarea></label>" +
        '<button class="btn btn-primary btn-block" type="submit">Salvar conexão</button>' +
        "</form>" +
        '<div class="stack" style="margin-top:18px">' +
        '<button class="btn btn-outline btn-block" data-action="copy-sql">Copiar SQL</button>' +
        '<pre class="setup-sql">' +
        FSY.esc(FSY.SCHEMA_SQL) +
        "</pre>" +
        '<button class="btn btn-ghost btn-block" data-action="go" data-to="welcome">Voltar</button>' +
        "</div>"
    );
  }

  function field(name, label, type, required, value) {
    return (
      '<label class="field"><span>' +
      label +
      (required ? " *" : "") +
      '</span><input name="' +
      name +
      '" type="' +
      type +
      '"' +
      (required ? " required" : "") +
      (value ? ' value="' + FSY.esc(value) + '"' : "") +
      "></label>"
    );
  }

  async function viewInicio(session) {
    if (session.perfil === "consultor" && !FSY.isLideranca(session)) return viewConsultorHome(session);
    const rows = await FSY.listParticipantes();
    state.participantes = rows;
    const companhias = new Set(rows.map(function (r) { return r.companhia; }));
    const semQuarto = rows.filter(function (r) { return !r.quarto; }).length;
    const comObs = rows.filter(function (r) { return r.observacoes; }).length;
    const pendentes = await FSY.countPendentes();
    return shell(
      session,
      '<h1 class="page-title">Início</h1>' +
        '<p class="page-lead">Olá, ' +
        FSY.esc(session.nome.split(" ")[0]) +
        (FSY.isAdmin(session)
          ? ". Você é a administradora: cadastre os e-mails da liderança em Usuários."
          : ". Visão geral da conferência.") +
        "</p>" +
        '<div class="stats">' +
        stat(rows.length, "Participantes") +
        stat(companhias.size, "Companhias", "gold") +
        stat(semQuarto, "Sem quarto", "warn") +
        stat(comObs, "Com observações", "warn") +
        stat(pendentes, "Acessos pendentes", pendentes ? "alert" : "") +
        "</div>" +
        '<div class="toolbar">' +
        '<a class="btn btn-primary" href="#/participantes/novo">' +
        ICONS.plus +
        " Adicionar participante</a>" +
        '<a class="btn btn-outline" href="#/usuarios">Solicitações' +
        (pendentes ? '<span class="badge badge-count">' + pendentes + "</span>" : "") +
        "</a></div>"
    );
  }

  function stat(value, label, extra) {
    return (
      '<article class="stat-card ' +
      (extra || "") +
      '"><div class="stat-value">' +
      value +
      '</div><div class="stat-label">' +
      label +
      "</div></article>"
    );
  }

  async function viewParticipantes(session) {
    if (session.perfil !== "lideranca" && !FSY.isLideranca(session)) return viewInicio(session);
    if (!state.participantes.length) state.participantes = await FSY.listParticipantes();
    const f = state.filters;
    let rows = state.participantes.slice();
    const q = f.q.trim().toLowerCase();
    if (q) {
      rows = rows.filter(function (r) {
        return [r.nome, r.ala, r.estaca, r.consultor].join(" ").toLowerCase().indexOf(q) !== -1;
      });
    }
    if (f.companhia) rows = rows.filter(function (r) { return String(r.companhia) === String(f.companhia); });
    if (f.estaca) rows = rows.filter(function (r) { return r.estaca === f.estaca; });
    rows.sort(function (a, b) {
      if (f.sort === "companhia") return a.companhia - b.companhia || a.nome.localeCompare(b.nome, "pt-BR");
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (f.page > pages) f.page = pages;
    const slice = rows.slice((f.page - 1) * PAGE_SIZE, f.page * PAGE_SIZE);
    const estacas = unique(state.participantes.map(function (r) { return r.estaca; })).sort();
    const comps = unique(state.participantes.map(function (r) { return r.companhia; })).sort(function (a, b) { return a - b; });

    const tableRows = slice
      .map(function (r) {
        return (
          "<tr data-action='open-part' data-id='" +
          r.id +
          "'><td>" +
          FSY.esc(r.nome) +
          (r.observacoes ? " ⚠️" : "") +
          "</td><td>" +
          FSY.esc(r.ala) +
          "</td><td>" +
          FSY.esc(r.estaca) +
          "</td><td>" +
          r.companhia +
          "</td><td>" +
          FSY.esc(r.quarto || "—") +
          "</td><td>" +
          FSY.esc(r.consultor) +
          '</td><td class="actions" onclick="event.stopPropagation()">' +
          '<button class="btn btn-ghost btn-icon" data-action="go" data-to="participantes/editar/' +
          r.id +
          '" title="Editar">' +
          ICONS.pencil +
          "</button>" +
          '<button class="btn btn-ghost btn-icon" data-action="del-part" data-id="' +
          r.id +
          '" data-nome="' +
          FSY.esc(r.nome) +
          '" title="Excluir">' +
          ICONS.trash +
          "</button></td></tr>"
        );
      })
      .join("");

    const cards = slice
      .map(function (r) {
        return personCard(r, true);
      })
      .join("");

    return shell(
      session,
      '<h1 class="page-title">Participantes</h1>' +
        '<p class="page-lead">' +
        rows.length +
        " registro(s) encontrados.</p>" +
        '<div class="toolbar">' +
        '<div class="search">' +
        '<span class="search-icon">' +
        ICONS.search +
        "</span>" +
        '<input id="busca-part" placeholder="Buscar por nome, ala, estaca ou consultor" value="' +
        FSY.esc(f.q) +
        '">' +
        "</div>" +
        '<select id="filtro-companhia"><option value="">Companhia</option>' +
        comps
          .map(function (c) {
            return '<option value="' + c + '"' + (String(f.companhia) === String(c) ? " selected" : "") + ">" + c + "</option>";
          })
          .join("") +
        "</select>" +
        '<select id="filtro-estaca"><option value="">Estaca</option>' +
        estacas
          .map(function (e) {
            return (
              '<option value="' +
              FSY.esc(e) +
              '"' +
              (f.estaca === e ? " selected" : "") +
              ">" +
              FSY.esc(e) +
              "</option>"
            );
          })
          .join("") +
        "</select>" +
        '<select id="filtro-sort"><option value="nome"' +
        (f.sort === "nome" ? " selected" : "") +
        ">Ordenar por nome</option><option value='companhia'" +
        (f.sort === "companhia" ? " selected" : "") +
        ">Ordenar por companhia</option></select>" +
        '<a class="btn btn-primary" href="#/participantes/novo">Adicionar</a>' +
        '<button class="btn btn-outline" data-action="import">Importar planilha</button>' +
        '<button class="btn btn-ghost" data-action="export">Exportar CSV</button>' +
        "</div>" +
        '<div class="table-wrap desktop-table desktop-only"><table><thead><tr><th>Nome</th><th>Ala</th><th>Estaca</th><th>Cia</th><th>Quarto</th><th>Consultor</th><th></th></tr></thead><tbody>' +
        (tableRows || '<tr><td colspan="7">Nenhum participante.</td></tr>') +
        "</tbody></table></div>" +
        '<div class="list table-as-cards mobile-only">' +
        (cards || '<div class="empty">Nenhum participante.</div>') +
        "</div>" +
        pager(f.page, pages)
    );
  }

  function pager(page, pages) {
    return (
      '<div class="pager"><button class="btn btn-ghost btn-sm" data-action="page" data-dir="-1"' +
      (page <= 1 ? " disabled" : "") +
      ">Anterior</button><span class='muted'>Página " +
      page +
      " de " +
      pages +
      '</span><button class="btn btn-ghost btn-sm" data-action="page" data-dir="1"' +
      (page >= pages ? " disabled" : "") +
      ">Próxima</button></div>"
    );
  }

  function personCard(r, editable) {
    const wa = FSY.waLink(r.contato_responsavel);
    return (
      '<article class="person-card' +
      (r.observacoes ? " obs" : "") +
      '" data-action="open-part" data-id="' +
      r.id +
      '"><div class="person-name">' +
      FSY.esc(r.nome) +
      (r.observacoes ? " ⚠️" : "") +
      "</div>" +
      '<div class="meta">' +
      FSY.esc(r.ala) +
      " · " +
      FSY.esc(r.estaca) +
      " · Cia " +
      r.companhia +
      (r.quarto ? " · Quarto " + FSY.esc(r.quarto) : "") +
      "</div>" +
      '<div class="meta">Consultor: ' +
      FSY.esc(r.consultor) +
      "</div>" +
      (editable
        ? '<div class="actions" onclick="event.stopPropagation()"><a class="btn btn-ghost btn-sm" href="#/participantes/editar/' +
          r.id +
          '">Editar</a><button class="btn btn-ghost btn-sm" data-action="del-part" data-id="' +
          r.id +
          '" data-nome="' +
          FSY.esc(r.nome) +
          '">Excluir</button></div>'
        : "") +
      (wa
        ? '<a class="wa" href="' +
          wa +
          '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' +
          ICONS.wa +
          " Responsável</a>"
        : "") +
      "</article>"
    );
  }

  async function viewForm(session) {
    if (!requireLideranca()) return "";
    const id = state.params.id;
    let row = {
      nome: "",
      ala: "",
      estaca: "",
      contato_lider: "",
      contato_responsavel: "",
      consultor: "",
      companhia: "",
      quarto: "",
      observacoes: "",
    };
    if (id) row = await FSY.getParticipante(id);
    return shell(
      session,
      '<h1 class="page-title">' +
        (id ? "Editar participante" : "Novo participante") +
        "</h1>" +
        '<form class="card stack" data-form="participante" data-id="' +
        FSY.esc(id || "") +
        '">' +
        field("nome", "Nome completo", "text", true, row.nome) +
        field("ala", "Ala", "text", true, row.ala) +
        field("estaca", "Estaca", "text", true, row.estaca) +
        field("contato_lider", "Contato do líder", "tel", true, row.contato_lider) +
        field("contato_responsavel", "Contato do responsável", "tel", true, row.contato_responsavel) +
        field("consultor", "Consultor responsável", "text", true, row.consultor) +
        field("companhia", "Número da companhia", "number", true, row.companhia) +
        field("quarto", "Número do quarto", "text", false, row.quarto || "") +
        '<label class="field"><span>Observações</span><textarea name="observacoes" placeholder="Restrições alimentares, medicamentos, etc.">' +
        FSY.esc(row.observacoes || "") +
        "</textarea></label>" +
        '<div class="row"><button class="btn btn-primary" type="submit">Salvar</button>' +
        '<a class="btn btn-ghost" href="#/participantes">Cancelar</a></div></form>'
    );
  }

  async function viewCompanhias(session) {
    if (!requireLideranca()) return "";
    const rows = await FSY.listParticipantes();
    const map = {};
    rows.forEach(function (r) {
      if (!map[r.companhia]) map[r.companhia] = [];
      map[r.companhia].push(r);
    });
    const keys = Object.keys(map)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });
    const cards = keys
      .map(function (k) {
        const list = map[k];
        const consultor = list[0] ? list[0].consultor : "—";
        const hasObs = list.some(function (p) {
          return p.observacoes;
        });
        return (
          '<article class="company-card' +
          (hasObs ? " has-obs" : "") +
          '"><h3>Companhia ' +
          k +
          "</h3><p class='muted'>Consultor: " +
          FSY.esc(consultor) +
          " · " +
          list.length +
          " jovens</p><details><summary>Ver participantes</summary><div class='list' style='margin-top:10px'>" +
          list
            .map(function (p) {
              return (
                "<div>" +
                FSY.esc(p.nome) +
                (p.observacoes ? " ⚠️" : "") +
                (p.quarto ? " · Q " + FSY.esc(p.quarto) : "") +
                "</div>"
              );
            })
            .join("") +
          "</div></details></article>"
        );
      })
      .join("");
    return shell(
      session,
      '<h1 class="page-title">Companhias</h1><p class="page-lead">Cards com borda dourada indicam observações na companhia.</p><div class="grid-cards">' +
        (cards || '<div class="empty">Nenhuma companhia ainda.</div>') +
        "</div>"
    );
  }

  async function viewQuartos(session) {
    if (!requireLideranca()) return "";
    const rows = await FSY.listParticipantes();
    const groups = { __none: [] };
    rows.forEach(function (r) {
      const key = r.quarto ? String(r.quarto) : "__none";
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    const keys = Object.keys(groups)
      .filter(function (k) {
        return k !== "__none";
      })
      .sort(function (a, b) {
        return a.localeCompare(b, "pt-BR", { numeric: true });
      });
    let html =
      '<h1 class="page-title">Quartos</h1><div class="room-group"><h3>⚠️ Sem quarto definido (' +
      groups.__none.length +
      ")</h3><div class='list'>" +
      (groups.__none.map(function (p) { return personCard(p, true); }).join("") || '<div class="muted">Todos já têm quarto.</div>') +
      "</div></div>";
    html += keys
      .map(function (k) {
        return (
          '<div class="room-group"><h3>Quarto ' +
          FSY.esc(k) +
          " (" +
          groups[k].length +
          ")</h3><div class='list'>" +
          groups[k].map(function (p) { return personCard(p, true); }).join("") +
          "</div></div>"
        );
      })
      .join("");
    return shell(session, html);
  }

  async function viewUsuarios(session) {
    if (!requireLideranca()) return "";
    const rows = await FSY.listUsuarios();
    state.usuarios = rows;
    const f = state.userFilters;
    let list = rows.slice();
    if (f.status !== "todos") list = list.filter(function (u) { return u.status === f.status; });
    if (f.perfil !== "todos") list = list.filter(function (u) { return u.perfil === f.perfil; });
    const pendentes = rows.filter(function (u) { return u.status === "pendente"; });
    const admin = FSY.isAdmin(session);
    let liderBox = "";
    if (admin) {
      const emails = await FSY.listEmailsLideranca();
      liderBox =
        '<section class="card" style="margin-bottom:18px">' +
        "<h2 class=\"page-title\" style=\"font-size:22px\">E-mails da liderança</h2>" +
        "<p class=\"page-lead\">Quem você adicionar aqui entra no app como liderança do evento, sem fila de aprovação.</p>" +
        '<form class="stack" data-form="lider-email">' +
        '<div class="row">' +
        '<label class="field" style="flex:1;min-width:220px"><span>E-mail do líder</span><input name="email" type="email" required placeholder="nome@email.com"></label>' +
        '<button class="btn btn-primary" type="submit" style="align-self:end">Adicionar liderança</button>' +
        "</div></form>" +
        '<div class="list" style="margin-top:12px">' +
        emails
          .map(function (item) {
            const isAdm = item.email === FSY.ADMIN_EMAIL;
            return (
              '<article class="person-card"><div class="person-name">' +
              FSY.esc(item.email) +
              (isAdm ? ' <span class="badge badge-aprovado">Administradora</span>' : ' <span class="badge">Liderança</span>') +
              "</div>" +
              (isAdm
                ? '<div class="meta">Conta principal do aplicativo. Não pode ser removida.</div>'
                : '<div class="actions"><button class="btn btn-ghost btn-sm" data-action="del-lider-email" data-email="' +
                  FSY.esc(item.email) +
                  '">Remover</button></div>') +
              "</article>"
            );
          })
          .join("") +
        "</div></section>";
    }
    const item = function (u) {
      const isAdm = u.email === FSY.ADMIN_EMAIL;
      const perfilLabel = isAdm ? "Administradora" : u.perfil === "lideranca" ? "Liderança" : "Consultor";
      return (
        '<article class="person-card"><div class="person-name">' +
        FSY.esc(u.nome) +
        ' <span class="badge badge-' +
        u.status +
        '">' +
        u.status +
        "</span></div>" +
        '<div class="meta">' +
        FSY.esc(u.email) +
        " · " +
        perfilLabel +
        " · " +
        FSY.formatDate(u.criado_em) +
        "</div>" +
        (isAdm
          ? '<div class="meta">Administradora do aplicativo</div>'
          : '<div class="actions">' +
            (u.status !== "aprovado"
              ? '<button class="btn btn-success btn-sm" data-action="user-status" data-id="' +
                u.id +
                '" data-status="aprovado">Aprovar</button>'
              : "") +
            (u.status !== "bloqueado"
              ? '<button class="btn btn-danger btn-sm" data-action="user-status" data-id="' +
                u.id +
                '" data-status="bloqueado">Bloquear</button>'
              : "") +
            '<button class="btn btn-ghost btn-sm" data-action="del-user" data-id="' +
            u.id +
            '" data-nome="' +
            FSY.esc(u.nome) +
            '">Excluir</button></div>') +
        "</article>"
      );
    };
    return shell(
      session,
      '<h1 class="page-title">Usuários</h1>' +
        liderBox +
        (pendentes.length
          ? '<div class="alert" style="margin-bottom:14px"><strong>' +
            pendentes.length +
            " solicitação(ões) pendente(s)</strong></div>"
          : "") +
        '<div class="toolbar">' +
        '<select id="filtro-user-status"><option value="todos">Todos os status</option><option value="pendente">Pendentes</option><option value="aprovado">Aprovados</option><option value="bloqueado">Bloqueados</option></select>' +
        '<select id="filtro-user-perfil"><option value="todos">Todos os perfis</option><option value="lideranca">Liderança</option><option value="consultor">Consultor</option></select>' +
        "</div>" +
        '<div class="list">' +
        (list.map(item).join("") || '<div class="empty">Nenhum usuário.</div>') +
        "</div>"
    );
  }

  async function viewConsultorHome(session) {
    const rows = await FSY.minhaCompanhia(session.nome);
    const cards = rows
      .map(function (r) {
        const wa = FSY.waLink(r.contato_responsavel);
        return (
          '<article class="person-card' +
          (r.observacoes ? " obs" : "") +
          '"><div class="person-name">' +
          FSY.esc(r.nome) +
          "</div>" +
          '<div class="meta">' +
          FSY.esc(r.ala) +
          " · " +
          FSY.esc(r.estaca) +
          "</div>" +
          '<div class="meta">Quarto: ' +
          FSY.esc(r.quarto || "não definido") +
          "</div>" +
          '<div class="meta">Líder: ' +
          FSY.esc(r.contato_lider) +
          "</div>" +
          (wa
            ? '<a class="wa" href="' +
              wa +
              '" target="_blank" rel="noopener">' +
              ICONS.wa +
              " " +
              FSY.esc(r.contato_responsavel) +
              "</a>"
            : '<div class="meta">Responsável: ' + FSY.esc(r.contato_responsavel) + "</div>") +
          (r.observacoes
            ? '<div class="alert" style="margin-top:8px">⚠️ ' + FSY.esc(r.observacoes) + "</div>"
            : "") +
          "</article>"
        );
      })
      .join("");
    return shell(
      session,
      '<h1 class="page-title">' +
        FSY.esc(session.nome) +
        '</h1><p class="page-lead">Sua companhia tem ' +
        rows.length +
        " jovens.</p><div class='list'>" +
        (cards || '<div class="empty">Nenhum jovem vinculado ao seu nome ainda.</div>') +
        "</div>"
    );
  }

  async function viewBuscar(session) {
    return shell(
      session,
      '<h1 class="page-title">Buscar participante</h1>' +
        '<div class="search"><span class="search-icon">' +
        ICONS.search +
        '</span><input id="busca-geral" placeholder="Nome, ala ou estaca"></div>' +
        '<div id="busca-resultados" class="list" style="margin-top:14px"><div class="empty">Digite para buscar.</div></div>'
    );
  }

  function unique(arr) {
    return arr.filter(function (v, i, a) {
      return v && a.indexOf(v) === i;
    });
  }

  function modalHtml(title, body) {
    return (
      '<div class="modal-backdrop" id="modal"><div class="modal" role="dialog" aria-modal="true"><h2 class="page-title" style="font-size:24px">' +
      title +
      '</h2><div style="margin-top:12px">' +
      body +
      "</div></div></div>"
    );
  }

  function showModal(html) {
    closeModal();
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstElementChild);
  }

  function closeModal() {
    const m = document.getElementById("modal");
    if (m) m.remove();
  }

  function openParticipante(row, canEdit) {
    const wa = FSY.waLink(row.contato_responsavel);
    const body =
      '<div class="stack">' +
      detail("Nome", row.nome) +
      detail("Ala", row.ala) +
      detail("Estaca", row.estaca) +
      detail("Companhia", row.companhia) +
      detail("Quarto", row.quarto || "—") +
      detail("Consultor", row.consultor) +
      detail("Contato do líder", row.contato_lider) +
      detail(
        "Contato do responsável",
        wa
          ? '<a class="wa" href="' + wa + '" target="_blank" rel="noopener">' + ICONS.wa + " " + FSY.esc(row.contato_responsavel) + "</a>"
          : FSY.esc(row.contato_responsavel)
      ) +
      (row.observacoes ? '<div class="alert">⚠️ ' + FSY.esc(row.observacoes) + "</div>" : "") +
      '<div class="row">' +
      (canEdit
        ? '<a class="btn btn-primary" href="#/participantes/editar/' + row.id + '" data-action="close-modal">Editar</a>'
        : "") +
      '<button class="btn btn-ghost" data-action="close-modal">Fechar</button></div></div>';
    showModal(modalHtml(FSY.esc(row.nome), body));
  }

  function detail(label, value) {
    return "<div><strong>" + label + "</strong><div>" + (String(value).indexOf("<") === 0 ? value : FSY.esc(value)) + "</div></div>";
  }

  function openImport() {
    showModal(
      modalHtml(
        "Importar planilha",
        '<div class="stack"><p>Colunas esperadas, nesta ordem: Nome, Ala, Estaca, Contato Líder, Contato Responsável, Consultor, Companhia, Quarto, Observações.</p>' +
          '<button class="btn btn-outline" data-action="download-modelo">Baixar modelo CSV</button>' +
          '<label class="field"><span>Arquivo .xlsx ou .csv</span><input id="import-file" type="file" accept=".csv,.xlsx,.xls"></label>' +
          '<div id="import-preview"></div>' +
          '<label class="field"><span>Como importar</span><select id="import-mode"><option value="append">Adicionar aos existentes</option><option value="replace">Substituir todos os dados</option></select></label>' +
          '<div class="progress hidden" id="import-progress"><span></span></div>' +
          '<div class="row"><button class="btn btn-primary" data-action="confirm-import" disabled id="btn-confirm-import">Confirmar importação</button>' +
          '<button class="btn btn-ghost" data-action="close-modal">Cancelar</button></div></div>'
      )
    );
  }

  async function render() {
    const focusId = document.activeElement && document.activeElement.id;
    const focusPos =
      document.activeElement && typeof document.activeElement.selectionStart === "number"
        ? document.activeElement.selectionStart
        : null;
    const parsed = parseHash();
    state.route = parsed.name;
    state.params = parsed.params;
    const publicRoutes = { welcome: 1, login: 1, cadastro: 1, setup: 1 };
    if (!FSY.hasConfig() && parsed.name !== "setup" && parsed.name !== "welcome") {
      go("setup");
      root.innerHTML = viewSetup();
      return;
    }
    try {
      await withLoading(async function () {
        if (publicRoutes[parsed.name]) {
          const views = { welcome: viewWelcome, login: viewLogin, cadastro: viewCadastro, setup: viewSetup };
          root.innerHTML = views[parsed.name]();
          return;
        }
        const session = requireSession();
        if (!session) return;
        const leadershipOnly = { participantes: 1, companhias: 1, quartos: 1, usuarios: 1 };
        if (leadershipOnly[parsed.name] && !FSY.isLideranca(session)) {
          go("inicio");
          return;
        }
        let html = "";
        if (parsed.name === "inicio") html = await viewInicio(session);
        else if (parsed.name === "participantes" && (parsed.params.id || parsed.params.mode === "novo")) html = await viewForm(session);
        else if (parsed.name === "participantes") html = await viewParticipantes(session);
        else if (parsed.name === "companhias") html = await viewCompanhias(session);
        else if (parsed.name === "quartos") html = await viewQuartos(session);
        else if (parsed.name === "usuarios") html = await viewUsuarios(session);
        else if (parsed.name === "buscar") html = await viewBuscar(session);
        else html = await viewInicio(session);
        if (html) root.innerHTML = html;
        bindPage();
        if (focusId) {
          const el = document.getElementById(focusId);
          if (el && typeof el.focus === "function") {
            el.focus();
            if (focusPos != null && el.setSelectionRange) {
              try {
                el.setSelectionRange(focusPos, focusPos);
              } catch (err) {}
            }
          }
        }
      });
    } catch (err) {
      root.innerHTML =
        '<div class="auth-wrap"><div class="auth-card"><div class="alert alert-error">' +
        FSY.esc(FSY.friendlyError(err)) +
        '</div><button class="btn btn-primary btn-block" data-action="go" data-to="setup" style="margin-top:12px">Abrir configuração</button></div></div>';
    }
  }

  function bindPage() {
    const busca = document.getElementById("busca-part");
    if (busca) {
      const apply = FSY.debounce(function () {
        state.filters.q = busca.value;
        state.filters.page = 1;
        render();
      }, 300);
      busca.addEventListener("input", apply);
    }
    const fc = document.getElementById("filtro-companhia");
    const fe = document.getElementById("filtro-estaca");
    const fs = document.getElementById("filtro-sort");
    if (fc)
      fc.addEventListener("change", function () {
        state.filters.companhia = fc.value;
        state.filters.page = 1;
        render();
      });
    if (fe)
      fe.addEventListener("change", function () {
        state.filters.estaca = fe.value;
        state.filters.page = 1;
        render();
      });
    if (fs)
      fs.addEventListener("change", function () {
        state.filters.sort = fs.value;
        render();
      });
    const us = document.getElementById("filtro-user-status");
    const up = document.getElementById("filtro-user-perfil");
    if (us) {
      us.value = state.userFilters.status;
      us.addEventListener("change", function () {
        state.userFilters.status = us.value;
        render();
      });
    }
    if (up) {
      up.value = state.userFilters.perfil;
      up.addEventListener("change", function () {
        state.userFilters.perfil = up.value;
        render();
      });
    }
    const geral = document.getElementById("busca-geral");
    if (geral) {
      const run = FSY.debounce(async function () {
        const box = document.getElementById("busca-resultados");
        const term = geral.value.trim();
        if (!term) {
          box.innerHTML = '<div class="empty">Digite para buscar.</div>';
          return;
        }
        try {
          setLoading(true);
          const rows = await FSY.searchParticipantes(term);
          box.innerHTML =
            rows
              .map(function (r) {
                const wa = FSY.waLink(r.contato_responsavel);
                return (
                  '<article class="person-card' +
                  (r.observacoes ? " obs" : "") +
                  '"><div class="person-name">' +
                  FSY.esc(r.nome) +
                  "</div><div class='meta'>" +
                  FSY.esc(r.ala) +
                  " · " +
                  FSY.esc(r.estaca) +
                  " · Cia " +
                  r.companhia +
                  " · Quarto " +
                  FSY.esc(r.quarto || "—") +
                  "</div><div class='meta'>Consultor: " +
                  FSY.esc(r.consultor) +
                  "</div><div class='meta'>Líder: " +
                  FSY.esc(r.contato_lider) +
                  "</div>" +
                  (wa ? '<a class="wa" href="' + wa + '" target="_blank" rel="noopener">' + ICONS.wa + " Responsável</a>" : "") +
                  (r.observacoes ? '<div class="alert" style="margin-top:8px">⚠️ ' + FSY.esc(r.observacoes) + "</div>" : "") +
                  "</article>"
                );
              })
              .join("") || '<div class="empty">Nenhum resultado.</div>';
        } catch (err) {
          toast(FSY.friendlyError(err));
        } finally {
          setLoading(false);
        }
      }, 300);
      geral.addEventListener("input", run);
    }
  }

  document.addEventListener("click", async function (e) {
    const t = e.target.closest("[data-action]");
    if (!t) {
      if (e.target.id === "modal") closeModal();
      return;
    }
    const action = t.getAttribute("data-action");
    if (action === "go") go(t.getAttribute("data-to"));
    if (action === "close-modal") closeModal();
    if (action === "logout") {
      FSY.logout().then(function () {
        go("welcome");
        toast("Você saiu.");
      });
    }
    if (action === "login-google") {
      withLoading(function () {
        return FSY.loginWithGoogle();
      }).catch(function (err) {
        toast(FSY.friendlyError(err));
      });
    }
    if (action === "logo-secret") {
      state.logoClicks += 1;
      if (state.logoClicks >= 5) {
        state.logoClicks = 0;
        go("setup");
      }
    }
    if (action === "copy-sql") {
      try {
        await navigator.clipboard.writeText(FSY.SCHEMA_SQL);
        toast("SQL copiado.");
      } catch (err) {
        toast("Copie o SQL manualmente.");
      }
    }
    if (action === "page") {
      state.filters.page += Number(t.getAttribute("data-dir"));
      if (state.filters.page < 1) state.filters.page = 1;
      render();
    }
    if (action === "export") {
      try {
        const rows = state.participantes.length ? state.participantes : await FSY.listParticipantes();
        FSY.downloadText("participantes-fsy-2027.csv", FSY.toCsv(rows), "text/csv;charset=utf-8");
        toast("CSV gerado.");
      } catch (err) {
        toast(FSY.friendlyError(err));
      }
    }
    if (action === "import") openImport();
    if (action === "download-modelo") {
      FSY.downloadText(
        "modelo-participantes.csv",
        "Nome,Ala,Estaca,Contato Líder,Contato Responsável,Consultor,Companhia,Quarto,Observações\r\nMaria Silva,Ala Centro,Estaca Recife,81999990000,81988880000,Ana Costa,1,101,Alergia a amendoim\r\nJoão Santos,Ala Norte,Estaca Recife,81977770000,81966660000,Ana Costa,1,101,",
        "text/csv;charset=utf-8"
      );
    }
    if (action === "open-part") {
      try {
        const row = await withLoading(function () {
          return FSY.getParticipante(t.getAttribute("data-id"));
        });
        openParticipante(row, FSY.isLideranca(FSY.getSession()));
      } catch (err) {
        toast(FSY.friendlyError(err));
      }
    }
    if (action === "del-part") {
      const nome = t.getAttribute("data-nome");
      if (!confirm("Tem certeza que deseja remover " + nome + "?")) return;
      try {
        await withLoading(function () {
          return FSY.deleteParticipante(t.getAttribute("data-id"));
        });
        state.participantes = [];
        toast("Participante removido.");
        render();
      } catch (err) {
        toast(FSY.friendlyError(err));
      }
    }
    if (action === "user-status") {
      try {
        await withLoading(function () {
          return FSY.setUsuarioStatus(t.getAttribute("data-id"), t.getAttribute("data-status"));
        });
        toast(t.getAttribute("data-status") === "aprovado" ? "Usuário aprovado." : "Usuário bloqueado.");
        render();
      } catch (err) {
        toast(FSY.friendlyError(err));
      }
    }
    if (action === "del-user") {
      const nome = t.getAttribute("data-nome");
      if (!confirm("Tem certeza que deseja remover " + nome + "?")) return;
      try {
        await withLoading(function () {
          return FSY.deleteUsuario(t.getAttribute("data-id"));
        });
        toast("Usuário excluído.");
        render();
      } catch (err) {
        toast(FSY.friendlyError(err));
      }
    }
    if (action === "del-lider-email") {
      const email = t.getAttribute("data-email");
      if (!confirm("Remover " + email + " da liderança?")) return;
      try {
        await withLoading(function () {
          return FSY.removeEmailLideranca(email);
        });
        toast("E-mail removido da liderança.");
        render();
      } catch (err) {
        toast(FSY.friendlyError(err));
      }
    }
    if (action === "confirm-import") {
      if (!state.importRows.length) return;
      const mode = document.getElementById("import-mode").value;
      const bar = document.getElementById("import-progress");
      bar.classList.remove("hidden");
      const span = bar.querySelector("span");
      try {
        await withLoading(async function () {
          const onProgress = function (done, total) {
            span.style.width = Math.round((done / total) * 100) + "%";
          };
          if (mode === "replace") await FSY.replaceAllParticipantes(state.importRows, onProgress);
          else await FSY.insertBatch(state.importRows, onProgress);
        });
        state.participantes = [];
        closeModal();
        toast(state.importRows.length + " participantes importados com sucesso");
        go("participantes");
        render();
      } catch (err) {
        toast(FSY.friendlyError(err));
      }
    }
  });

  document.addEventListener("change", async function (e) {
    if (e.target && e.target.id === "import-file" && e.target.files[0]) {
      try {
        const rows = await FSY.parseSpreadsheet(e.target.files[0]);
        state.importRows = rows;
        const box = document.getElementById("import-preview");
        const preview = rows.slice(0, 10);
        box.innerHTML =
          "<p><strong>" +
          rows.length +
          " participantes encontrados no arquivo</strong></p>" +
          '<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Ala</th><th>Estaca</th><th>Cia</th></tr></thead><tbody>' +
          preview
            .map(function (r) {
              return (
                "<tr><td>" +
                FSY.esc(r.nome) +
                "</td><td>" +
                FSY.esc(r.ala) +
                "</td><td>" +
                FSY.esc(r.estaca) +
                "</td><td>" +
                r.companhia +
                "</td></tr>"
              );
            })
            .join("") +
          "</tbody></table></div>";
        document.getElementById("btn-confirm-import").disabled = rows.length === 0;
      } catch (err) {
        toast(FSY.friendlyError(err));
      }
    }
  });

  document.addEventListener("submit", async function (e) {
    const form = e.target.closest("[data-form]");
    if (!form) return;
    e.preventDefault();
    const fd = new FormData(form);
    const type = form.getAttribute("data-form");
    try {
      if (type === "setup") {
        FSY.setConfig(fd.get("url"), fd.get("anonKey"));
        toast("Conexão salva.");
        go("welcome");
        return;
      }
      if (type === "login") {
        await withLoading(function () {
          return FSY.login(fd.get("email"), fd.get("senha"));
        });
        go("inicio");
        return;
      }
      if (type === "cadastro") {
        const result = await withLoading(function () {
          return FSY.register({
            nome: fd.get("nome"),
            email: fd.get("email"),
            senha: fd.get("senha"),
            confirma: fd.get("confirma"),
          });
        });
        if (result.autoApproved) {
          toast("Acesso de liderança liberado. Bem-vinda!");
          go("inicio");
        } else if (result.needsEmailConfirm) {
          alert("Conta criada. Confirme o e-mail ou, no painel do Supabase, desative Confirm email em Authentication > Sign In / Providers.");
          go("login");
        } else {
          alert("Solicitação enviada! Aguarde a aprovação da liderança para acessar o sistema.");
          go("login");
        }
        return;
      }
      if (type === "lider-email") {
        await withLoading(function () {
          return FSY.addEmailLideranca(fd.get("email"));
        });
        toast("E-mail adicionado à liderança.");
        render();
        return;
      }
      if (type === "participante") {
        const row = {
          nome: fd.get("nome"),
          ala: fd.get("ala"),
          estaca: fd.get("estaca"),
          contato_lider: fd.get("contato_lider"),
          contato_responsavel: fd.get("contato_responsavel"),
          consultor: fd.get("consultor"),
          companhia: fd.get("companhia"),
          quarto: fd.get("quarto"),
          observacoes: fd.get("observacoes"),
        };
        await withLoading(function () {
          return FSY.saveParticipante(row, form.getAttribute("data-id") || null);
        });
        state.participantes = [];
        toast("Participante salvo.");
        go("participantes");
      }
    } catch (err) {
      toast(FSY.friendlyError(err));
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  window.addEventListener("hashchange", render);
  (async function boot() {
    try {
      await FSY.restoreSession();
    } catch (err) {
      toast(FSY.friendlyError(err));
    }
    const notice = FSY.consumeAuthNotice();
    if (notice) toast(notice);
    const session = FSY.getSession();
    const hash = (location.hash || "").replace(/^#\/?/, "");
    if (session && (!hash || hash === "welcome" || hash === "login" || hash === "cadastro")) {
      location.hash = "#/inicio";
      return;
    }
    if (!location.hash) location.hash = "#/welcome";
    else render();
  })();
})();
