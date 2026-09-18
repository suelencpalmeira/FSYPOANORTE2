(function (global) {
  const STORAGE_SESSION = "fsy2027_sessao";
  const STORAGE_CONFIG = "fsy2027_config";
  const ADMIN_EMAIL = "suelencpalmeira@gmail.com";
  const DEFAULT_CONFIG = {
    url: "https://pukresrhryarypzzmdch.supabase.co",
    anonKey: "sb_publishable_toPPju3mn50feKnWbeR63A_tWNT8DZA",
  };

  const SCHEMA_SQL = `-- FSY 2027 — execute no SQL Editor do Supabase
create table if not exists public.usuarios (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  email text unique not null,
  senha text not null,
  perfil text not null check (perfil in ('lideranca', 'consultor')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'bloqueado')),
  criado_em timestamp default now()
);

create table if not exists public.participantes (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  ala text not null,
  estaca text not null,
  contato_lider text not null,
  contato_responsavel text not null,
  consultor text not null,
  companhia integer not null,
  quarto text,
  observacoes text,
  criado_em timestamp default now(),
  atualizado_em timestamp default now()
);

create index if not exists idx_usuarios_email on public.usuarios (email);
create index if not exists idx_usuarios_status on public.usuarios (status);
create index if not exists idx_participantes_nome on public.participantes (nome);
create index if not exists idx_participantes_consultor on public.participantes (consultor);
create index if not exists idx_participantes_companhia on public.participantes (companhia);
create index if not exists idx_participantes_estaca on public.participantes (estaca);

alter table public.usuarios enable row level security;
alter table public.participantes enable row level security;

drop policy if exists usuarios_anon_all on public.usuarios;
create policy usuarios_anon_all on public.usuarios for all to anon, authenticated using (true) with check (true);

drop policy if exists participantes_anon_all on public.participantes;
create policy participantes_anon_all on public.participantes for all to anon, authenticated using (true) with check (true);`;

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function digits(value) {
    return String(value ?? "").replace(/\D/g, "");
  }

  function waLink(phone) {
    const n = digits(phone);
    if (n.length < 10) return null;
    const intl = n.length === 11 || n.length === 10 ? "55" + n : n;
    return "https://wa.me/" + intl;
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR");
  }

  function debounce(fn, ms) {
    let t;
    return function debounced() {
      const args = arguments;
      const ctx = this;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(ctx, args);
      }, ms);
    };
  }

  function normalizeHeader(h) {
    return String(h || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  async function sha256(text) {
    const str = String(text ?? "");
    if (global.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf))
        .map(function (b) {
          return b.toString(16).padStart(2, "0");
        })
        .join("");
    }
    return "btoa:" + btoa(unescape(encodeURIComponent(str)));
  }

  function getConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.url && parsed.anonKey) return parsed;
      }
    } catch (e) {}
    return { url: DEFAULT_CONFIG.url, anonKey: DEFAULT_CONFIG.anonKey };
  }

  function setConfig(url, anonKey) {
    localStorage.setItem(
      STORAGE_CONFIG,
      JSON.stringify({ url: String(url || "").trim(), anonKey: String(anonKey || "").trim() })
    );
    clientCache = null;
  }

  function hasConfig() {
    const c = getConfig();
    return Boolean(c.url && c.anonKey);
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(user) {
    const payload = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
    };
    localStorage.setItem(STORAGE_SESSION, JSON.stringify(payload));
    return payload;
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_SESSION);
  }

  let clientCache = null;

  function client() {
    if (clientCache) return clientCache;
    const cfg = getConfig();
    if (!cfg.url || !cfg.anonKey) {
      throw new Error("Conexão com o Supabase ainda não foi configurada.");
    }
    if (!global.supabase || !global.supabase.createClient) {
      throw new Error("Biblioteca do Supabase não carregou. Verifique a internet.");
    }
    clientCache = global.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        flowType: "pkce",
      },
    });
    return clientCache;
  }

  function friendlyError(err) {
    const msg = (err && (err.message || err.error_description || err.details)) || String(err || "");
    if (/failed to fetch|network|load failed/i.test(msg)) {
      return "Não foi possível conectar ao Supabase. Confira a internet e as credenciais.";
    }
    if (/relation .* does not exist|schema cache/i.test(msg)) {
      return "As tabelas ainda não existem. Abra Configuração e execute o SQL no Supabase.";
    }
    if (/invalid api key|jwt/i.test(msg)) {
      return "A chave do Supabase parece inválida. Revise a configuração.";
    }
    if (/duplicate key|unique|already registered/i.test(msg)) {
      return "Este e-mail já está cadastrado.";
    }
    if (/email not confirmed/i.test(msg)) {
      return "Confirme o e-mail enviado pelo Supabase ou desative a confirmação em Authentication > Sign In / Providers > Email.";
    }
    if (/invalid login credentials/i.test(msg)) {
      return "E-mail ou senha incorretos.";
    }
    if (/unsupported provider|provider is not enabled|validation_failed|unsupported_provider/i.test(msg)) {
      return "O login com Google ainda não está ativo. No Supabase, abra Authentication > Sign In / Providers e ative o Google.";
    }
    return msg || "Algo deu errado. Tente novamente.";
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isAdmin(user) {
    const u = user || getSession();
    return Boolean(u && normalizeEmail(u.email) === ADMIN_EMAIL);
  }

  function isLideranca(user) {
    const u = user || getSession();
    return Boolean(u && (u.perfil === "lideranca" || isAdmin(u)));
  }

  async function assertLideranca() {
    const s = getSession();
    if (!isLideranca(s)) {
      throw new Error("Somente a liderança pode alterar estes dados.");
    }
  }

  async function assertAdmin() {
    if (!isAdmin()) {
      throw new Error("Somente a administradora pode gerenciar os e-mails da liderança.");
    }
  }

  async function loadProfile(userId) {
    const { data, error } = await client()
      .from("usuarios")
      .select("id, nome, email, perfil, status")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  let lastAuthNotice = "";

  function consumeAuthNotice() {
    const n = lastAuthNotice;
    lastAuthNotice = "";
    return n;
  }

  function redirectUrl() {
    return location.origin + location.pathname;
  }

  async function loginWithGoogle() {
    const { error } = await client().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl(),
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw error;
  }

  async function restoreSession() {
    const c = client();
    const params = new URLSearchParams(location.search);
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      lastAuthNotice = decodeURIComponent(oauthError.replace(/\+/g, " "));
    }

    const { data, error } = await c.auth.getSession();
    if (error) throw error;
    let session = data.session;
    if (!session && params.has("code")) {
      for (let i = 0; i < 20 && !session; i += 1) {
        await new Promise(function (resolve) {
          setTimeout(resolve, 150);
        });
        const again = await c.auth.getSession();
        session = again.data && again.data.session;
      }
    }

    if (params.has("code") || params.has("error") || params.has("error_description")) {
      history.replaceState({}, "", location.pathname + (location.hash || ""));
    }

    if (!session) {
      clearSession();
      return null;
    }
    const profile = await loadProfile(session.user.id);
    if (!profile) {
      await c.auth.signOut();
      clearSession();
      lastAuthNotice = "Seu cadastro não foi encontrado. Solicite acesso novamente.";
      return null;
    }
    if (profile.status === "pendente") {
      await c.auth.signOut();
      clearSession();
      lastAuthNotice = "Seu acesso ainda está sendo aprovado pela liderança.";
      return null;
    }
    if (profile.status === "bloqueado") {
      await c.auth.signOut();
      clearSession();
      lastAuthNotice = "Seu acesso foi bloqueado. Entre em contato com a liderança.";
      return null;
    }
    return setSession(profile);
  }

  async function logout() {
    try {
      await client().auth.signOut();
    } catch (e) {}
    clearSession();
  }

  async function login(email, senha) {
    const { data, error } = await client().auth.signInWithPassword({
      email: String(email).trim().toLowerCase(),
      password: String(senha || ""),
    });
    if (error) throw error;
    if (!data.user) throw new Error("E-mail ou senha incorretos.");
    const profile = await loadProfile(data.user.id);
    if (!profile) {
      await client().auth.signOut();
      throw new Error("Seu cadastro não foi encontrado. Solicite acesso novamente.");
    }
    if (profile.status === "pendente") {
      await client().auth.signOut();
      throw new Error("Seu acesso ainda está sendo aprovado pela liderança.");
    }
    if (profile.status === "bloqueado") {
      await client().auth.signOut();
      throw new Error("Seu acesso foi bloqueado. Entre em contato com a liderança.");
    }
    return setSession(profile);
  }

  async function register(payload) {
    const email = String(payload.email || "").trim().toLowerCase();
    const nome = String(payload.nome || "").trim();
    const senha = String(payload.senha || "");
    if (!nome || !email || senha.length < 6) {
      throw new Error("Preencha nome, e-mail e senha com pelo menos 6 caracteres.");
    }
    if (senha !== payload.confirma) {
      throw new Error("As senhas não coincidem.");
    }

    const { data, error } = await client().auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
        emailRedirectTo: location.origin + location.pathname,
      },
    });
    if (error) throw error;

    if (data.session && data.user) {
      const profile = await loadProfile(data.user.id);
      const autoApproved = Boolean(profile && profile.status === "aprovado");
      if (autoApproved) {
        setSession(profile);
      } else {
        await client().auth.signOut();
      }
      return { autoApproved, needsEmailConfirm: false };
    }
    return { autoApproved: false, needsEmailConfirm: true };
  }

  async function listParticipantes() {
    const { data, error } = await client()
      .from("participantes")
      .select("*")
      .order("nome", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function getParticipante(id) {
    const { data, error } = await client().from("participantes").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  }

  async function saveParticipante(row, id) {
    await assertLideranca();
    const payload = {
      nome: String(row.nome || "").trim(),
      ala: String(row.ala || "").trim(),
      estaca: String(row.estaca || "").trim(),
      contato_lider: String(row.contato_lider || "").trim(),
      contato_responsavel: String(row.contato_responsavel || "").trim(),
      consultor: String(row.consultor || "").trim(),
      companhia: Number(row.companhia),
      quarto: String(row.quarto || "").trim() || null,
      observacoes: String(row.observacoes || "").trim() || null,
    };
    if (
      !payload.nome ||
      !payload.ala ||
      !payload.estaca ||
      !payload.contato_lider ||
      !payload.contato_responsavel ||
      !payload.consultor ||
      !Number.isInteger(payload.companhia)
    ) {
      throw new Error("Preencha todos os campos obrigatórios.");
    }
    if (id) {
      const { error } = await client().from("participantes").update(payload).eq("id", id);
      if (error) throw error;
      return id;
    }
    const { data, error } = await client().from("participantes").insert(payload).select("id").single();
    if (error) throw error;
    return data.id;
  }

  async function deleteParticipante(id) {
    await assertLideranca();
    const { error } = await client().from("participantes").delete().eq("id", id);
    if (error) throw error;
  }

  async function replaceAllParticipantes(rows, onProgress) {
    await assertLideranca();
    const { error: delError } = await client().from("participantes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delError) throw delError;
    return insertBatch(rows, onProgress);
  }

  async function insertBatch(rows, onProgress) {
    await assertLideranca();
    const chunk = 50;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      const { error } = await client().from("participantes").insert(slice);
      if (error) throw error;
      if (onProgress) onProgress(Math.min(rows.length, i + slice.length), rows.length);
    }
  }

  async function searchParticipantes(term) {
    const q = String(term || "").trim();
    if (!q) return [];
    const like = "%" + q + "%";
    const { data, error } = await client()
      .from("participantes")
      .select("*")
      .or("nome.ilike." + like + ",ala.ilike." + like + ",estaca.ilike." + like)
      .order("nome")
      .limit(50);
    if (error) throw error;
    return data || [];
  }

  async function minhaCompanhia(nomeConsultor) {
    const like = "%" + String(nomeConsultor || "").trim() + "%";
    const { data, error } = await client()
      .from("participantes")
      .select("*")
      .ilike("consultor", like)
      .order("nome");
    if (error) throw error;
    return data || [];
  }

  async function listUsuarios() {
    await assertLideranca();
    const { data, error } = await client()
      .from("usuarios")
      .select("id, nome, email, perfil, status, criado_em")
      .order("criado_em", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function setUsuarioStatus(id, status) {
    await assertLideranca();
    const { data: alvo, error: readError } = await client()
      .from("usuarios")
      .select("id, email")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;
    if (alvo && normalizeEmail(alvo.email) === ADMIN_EMAIL) {
      throw new Error("A administradora não pode ser bloqueada.");
    }
    const { error } = await client().from("usuarios").update({ status }).eq("id", id);
    if (error) throw error;
  }

  async function deleteUsuario(id) {
    await assertLideranca();
    const session = getSession();
    if (session && session.id === id) {
      throw new Error("Você não pode excluir o próprio usuário enquanto está logado.");
    }
    const { data: alvo, error: readError } = await client()
      .from("usuarios")
      .select("id, email")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;
    if (alvo && normalizeEmail(alvo.email) === ADMIN_EMAIL) {
      throw new Error("A administradora não pode ser excluída.");
    }
    const { error } = await client().from("usuarios").delete().eq("id", id);
    if (error) throw error;
  }

  async function listEmailsLideranca() {
    await assertAdmin();
    const { data, error } = await client()
      .from("emails_lideranca")
      .select("email, criado_em")
      .order("email");
    if (error) throw error;
    return data || [];
  }

  async function addEmailLideranca(email) {
    await assertAdmin();
    const value = normalizeEmail(email);
    if (!value || value.indexOf("@") < 1) {
      throw new Error("Informe um e-mail válido.");
    }
    const { error } = await client().from("emails_lideranca").insert({ email: value });
    if (error) throw error;
  }

  async function removeEmailLideranca(email) {
    await assertAdmin();
    const value = normalizeEmail(email);
    if (value === ADMIN_EMAIL) {
      throw new Error("A administradora não pode ser removida da liderança.");
    }
    const { error } = await client().from("emails_lideranca").delete().eq("email", value);
    if (error) throw error;
  }

  async function countPendentes() {
    const { count, error } = await client()
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente");
    if (error) throw error;
    return count || 0;
  }

  function toCsv(rows) {
    const headers = [
      "Nome",
      "Ala",
      "Estaca",
      "Companhia",
      "Quarto",
      "Consultor",
      "Contato Líder",
      "Contato Responsável",
      "Observações",
    ];
    const lines = [headers.join(",")];
    rows.forEach(function (r) {
      const vals = [
        r.nome,
        r.ala,
        r.estaca,
        r.companhia,
        r.quarto || "",
        r.consultor,
        r.contato_lider,
        r.contato_responsavel,
        r.observacoes || "",
      ].map(csvCell);
      lines.push(vals.join(","));
    });
    return lines.join("\r\n");
  }

  function csvCell(v) {
    const s = String(v ?? "");
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 500);
  }

  const COL_MAP = {
    nome: "nome",
    ala: "ala",
    estaca: "estaca",
    contatolider: "contato_lider",
    contatodolider: "contato_lider",
    contatodoresponsavel: "contato_responsavel",
    contatoresponsavel: "contato_responsavel",
    consultor: "consultor",
    companhia: "companhia",
    quarto: "quarto",
    observacoes: "observacoes",
  };

  const ORDER_KEYS = [
    "nome",
    "ala",
    "estaca",
    "contato_lider",
    "contato_responsavel",
    "consultor",
    "companhia",
    "quarto",
    "observacoes",
  ];

  function parseSpreadsheet(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onerror = function () {
        reject(new Error("Não foi possível ler o arquivo."));
      };
      reader.onload = function (e) {
        try {
          if (!global.XLSX) throw new Error("A biblioteca de planilhas não carregou.");
          const wb = XLSX.read(e.target.result, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          if (!matrix.length) throw new Error("A planilha está vazia.");
          const header = matrix[0].map(normalizeHeader);
          const mapped = header.map(function (h) {
            return COL_MAP[h] || null;
          });
          const useOrder = mapped.filter(Boolean).length < 3;
          const rows = [];
          for (let i = 1; i < matrix.length; i += 1) {
            const line = matrix[i];
            if (!line || line.every(function (c) { return String(c).trim() === ""; })) continue;
            const obj = {
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
            if (useOrder) {
              ORDER_KEYS.forEach(function (k, idx) {
                obj[k] = line[idx] != null ? String(line[idx]).trim() : "";
              });
            } else {
              mapped.forEach(function (k, idx) {
                if (k) obj[k] = line[idx] != null ? String(line[idx]).trim() : "";
              });
            }
            obj.companhia = parseInt(String(obj.companhia).replace(/\D/g, ""), 10);
            if (!obj.nome || !Number.isInteger(obj.companhia)) continue;
            rows.push({
              nome: obj.nome,
              ala: obj.ala || "—",
              estaca: obj.estaca || "—",
              contato_lider: obj.contato_lider || "—",
              contato_responsavel: obj.contato_responsavel || "—",
              consultor: obj.consultor || "—",
              companhia: obj.companhia,
              quarto: obj.quarto || null,
              observacoes: obj.observacoes || null,
            });
          }
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  global.FSY = {
    SCHEMA_SQL,
    esc,
    digits,
    waLink,
    formatDate,
    debounce,
    sha256,
    getConfig,
    setConfig,
    hasConfig,
    getSession,
    setSession,
    clearSession,
    restoreSession,
    consumeAuthNotice,
    loginWithGoogle,
    logout,
    isAdmin,
    isLideranca,
    ADMIN_EMAIL,
    client,
    friendlyError,
    login,
    register,
    listParticipantes,
    getParticipante,
    saveParticipante,
    deleteParticipante,
    replaceAllParticipantes,
    insertBatch,
    searchParticipantes,
    minhaCompanhia,
    listUsuarios,
    setUsuarioStatus,
    deleteUsuario,
    listEmailsLideranca,
    addEmailLideranca,
    removeEmailLideranca,
    countPendentes,
    toCsv,
    downloadText,
    parseSpreadsheet,
  };
})(window);
