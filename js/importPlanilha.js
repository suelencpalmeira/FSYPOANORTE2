(function (global) {
  const EXPECTED_COLUMNS = [
    { key: "nome", label: "Nome", required: true },
    { key: "sobrenome", label: "Sobrenome" },
    { key: "nome_preferencia", label: "Nome de preferência" },
    { key: "data_nascimento", label: "Data de nascimento" },
    { key: "sexo", label: "Sexo" },
    { key: "telefone", label: "Telefone" },
    { key: "email", label: "E-mail" },
    { key: "info_medicas", label: "Informações médicas", sensitive: true },
    { key: "tamanho_camiseta", label: "Tamanho da camiseta" },
    { key: "alimentacao", label: "Informações sobre alimentação" },
    { key: "contato1_nome", label: "Nome do contato 1" },
    { key: "contato1_email", label: "E-mail para contato 1" },
    { key: "contato1_telefone", label: "Telefone para contato 1" },
    { key: "contato2_nome", label: "Nome do contato 2" },
    { key: "contato2_email", label: "E-mail do contato 2" },
    { key: "contato2_telefone", label: "Telefone para contato 2" },
    { key: "idade", label: "Idade" },
    { key: "submetido_em", label: "Data" },
    { key: "situacao", label: "Situação" },
    { key: "tipo", label: "Tipo" },
    { key: "estaca", label: "Nome da estaca/distrito" },
    { key: "ala", label: "Nome da ala/ramo" },
    { key: "bispo_email", label: "E-mail do bispo" },
    { key: "bispo_nome", label: "Nome do bispo" },
    { key: "documento", label: "Número do RG/CIN/Passaporte (Documento com foto)", sensitive: true },
    { key: "orgao_emissor", label: "Órgão emissor", sensitive: true },
    { key: "nome_responsavel", label: "Nome do Responsável", sensitive: true },
    { key: "telefone_responsavel", label: "Telefone do Responsável", sensitive: true },
    {
      key: "autorizacao_pais",
      label: "Me comprometo a baixar a AUTORIZAÇÃO DOS PAIS, preenchê-la corretamente e entregar a meu líder no dia do embarque. Compreendo que sem ela não posso subir no ônibus ou participar do programa",
      match: "prefix",
      sensitive: true,
    },
    { key: "cpf", label: "CPF", sensitive: true },
    { key: "apresentacao", label: "O que vou apresentar? Quanto tempo preciso?" },
    { key: "membro_igreja", label: "É membro da Igreja?" },
    { key: "condicoes_saude", label: "Nas informações de saúde você relatou alguma destas condições?", sensitive: true },
    { key: "detalhe_saude", label: "Caso tenha selecionado alguma condição de saúde acima, informe melhor neste campo.", sensitive: true },
  ];

  const PUBLIC_KEYS = [
    "nome",
    "sobrenome",
    "nome_preferencia",
    "data_nascimento",
    "sexo",
    "telefone",
    "email",
    "tamanho_camiseta",
    "alimentacao",
    "contato1_nome",
    "contato1_email",
    "contato1_telefone",
    "contato2_nome",
    "contato2_email",
    "contato2_telefone",
    "idade",
    "submetido_em",
    "situacao",
    "tipo",
    "estaca",
    "ala",
    "bispo_email",
    "bispo_nome",
    "apresentacao",
    "membro_igreja",
    "alerta_saude",
    "menor_idade",
    "contato_lider",
    "contato_responsavel",
    "consultor",
    "companhia",
    "quarto",
    "observacoes",
  ];

  const SENSITIVE_KEYS = [
    "documento",
    "orgao_emissor",
    "cpf",
    "cpf_valido",
    "nome_responsavel",
    "telefone_responsavel",
    "autorizacao_pais",
    "info_medicas",
    "condicoes_saude",
    "detalhe_saude",
  ];

  function normalizeHeader(h) {
    return String(h || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  function blankToNull(value) {
    if (value == null) return null;
    const s = String(value).trim();
    if (!s) return null;
    if (/^(nan|null|undefined|nenhuma|nenhum|n\/a|-)$/i.test(s)) return null;
    return s;
  }

  function digits(value) {
    return String(value == null ? "" : value).replace(/\D/g, "");
  }

  function excelSerialToDate(n) {
    const num = Number(n);
    if (!Number.isFinite(num) || num < 20000 || num > 80000) return null;
    const utc = Date.UTC(1899, 11, 30) + Math.round(num * 86400000);
    return new Date(utc);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toIsoDate(value) {
    if (value == null || value === "") return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.getFullYear() + "-" + pad2(value.getMonth() + 1) + "-" + pad2(value.getDate());
    }
    if (typeof value === "number") {
      const d = excelSerialToDate(value);
      return d ? toIsoDate(d) : null;
    }
    const s = String(value).trim();
    if (!s) return null;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
    const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (br) return br[3] + "-" + pad2(br[2]) + "-" + pad2(br[1]);
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) return toIsoDate(parsed);
    return null;
  }

  function toIsoDateTime(value) {
    if (value == null || value === "") return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return (
        value.getFullYear() +
        "-" +
        pad2(value.getMonth() + 1) +
        "-" +
        pad2(value.getDate()) +
        "T" +
        pad2(value.getHours()) +
        ":" +
        pad2(value.getMinutes()) +
        ":" +
        pad2(value.getSeconds()) +
        "-03:00"
      );
    }
    if (typeof value === "number") {
      const d = excelSerialToDate(value);
      return d ? toIsoDateTime(d) : null;
    }
    const s = String(value).trim();
    if (!s) return null;
    const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (br) {
      return (
        br[3] +
        "-" +
        pad2(br[2]) +
        "-" +
        pad2(br[1]) +
        "T" +
        pad2(br[4] || 0) +
        ":" +
        pad2(br[5] || 0) +
        ":" +
        pad2(br[6] || 0) +
        "-03:00"
      );
    }
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      if (/T|\s/.test(s)) return s.replace(" ", "T");
      return iso[1] + "-" + iso[2] + "-" + iso[3];
    }
    return null;
  }

  function normalizePhone(value) {
    const original = blankToNull(value);
    if (!original) return { e164: null, original: null, ok: true };
    const d = digits(original);
    if (!d || d.length < 8) return { e164: original, original: original, ok: false };
    if (/^\s*\+?\s*1\b/.test(original) && d.length === 11 && d.charAt(0) === "1") {
      return { e164: original, original: original, ok: false };
    }
    let national = d;
    if (national.indexOf("55") === 0 && (national.length === 12 || national.length === 13)) {
      national = national.slice(2);
    }
    if (national.length === 10 || national.length === 11) {
      return { e164: "+55" + national, original: original, ok: true };
    }
    if (d.length === 8 || d.length === 9) {
      return { e164: original, original: original, ok: false };
    }
    if (d.length >= 10 && d.length <= 15) {
      return { e164: "+" + d, original: original, ok: true };
    }
    return { e164: original, original: original, ok: false };
  }

  function normalizeCpf(value) {
    const original = blankToNull(value);
    if (!original) return { digits: null, original: null, ok: true, present: false };
    const d = digits(original);
    if (d.length === 11) return { digits: d, original: original, ok: true, present: true };
    return { digits: d || null, original: original, ok: false, present: true };
  }

  function parseBoolLoose(value) {
    const s = blankToNull(value);
    if (s == null) return null;
    if (/^(true|sim|1|yes|verdadeiro|x)$/i.test(s)) return true;
    if (/^(false|nao|não|0|no|falso)$/i.test(s)) return false;
    return null;
  }

  function parseMembro(value) {
    const s = blankToNull(value);
    if (s == null) return null;
    const n = s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (/^sou\s+membro/.test(n)) return true;
    if (/^nao\s+sou\s+membro/.test(n)) return false;
    return parseBoolLoose(s);
  }

  function parseSituacao(value) {
    const s = blankToNull(value);
    if (!s) return "pendente";
    const n = s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (/aguardando/.test(n)) return "pendente";
    if (/aprovad/.test(n)) return "aprovado";
    return "pendente";
  }

  function parseTipo(value) {
    const s = blankToNull(value);
    if (s && /consultor/i.test(s)) return "consultor";
    return "participante";
  }

  function parseIdade(value) {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
    const n = parseInt(String(value).replace(/\D/g, ""), 10);
    return Number.isInteger(n) && n >= 0 && n < 120 ? n : null;
  }

  function isHealthAlert(info, condicoes, detalhe) {
    const a = blankToNull(info);
    const b = blankToNull(condicoes);
    const c = blankToNull(detalhe);
    return Boolean(a || b || c);
  }

  function headerIndex(headers, col) {
    const wanted = normalizeHeader(col.label);
    for (let i = 0; i < headers.length; i += 1) {
      const actual = String(headers[i] == null ? "" : headers[i]).trim();
      if (!actual) continue;
      if (actual === col.label.trim()) return i;
      const norm = normalizeHeader(actual);
      if (norm === wanted) return i;
      if (col.match === "prefix" && (norm.indexOf(wanted.slice(0, 18)) === 0 || actual.indexOf(col.label.slice(0, 24)) === 0)) {
        return i;
      }
    }
    return -1;
  }

  function autoMapHeaders(headers) {
    const mapping = {};
    EXPECTED_COLUMNS.forEach(function (col) {
      mapping[col.key] = headerIndex(headers, col);
    });
    return mapping;
  }

  function pickSheetName(wb, preferred) {
    const names = (wb && wb.SheetNames) || [];
    if (preferred && names.indexOf(preferred) >= 0) return preferred;
    const todas = names.find(function (n) {
      return normalizeHeader(n) === "todas";
    });
    if (todas) return todas;
    return names[0] || null;
  }

  function looksLikeInscricao(mapping) {
    const hits = ["nome", "sobrenome", "tipo", "estaca", "ala", "email"].filter(function (k) {
      return mapping[k] >= 0;
    }).length;
    return hits >= 4;
  }

  function cellText(value) {
    if (value == null) return "";
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  function buildIssue(code, message) {
    return { code: code, message: message };
  }

  function mapRow(line, mapping, sheetRow) {
    function raw(key) {
      const idx = mapping[key];
      if (idx == null || idx < 0) return "";
      return line[idx];
    }

    const issues = [];
    const nome = blankToNull(raw("nome"));
    const sobrenome = blankToNull(raw("sobrenome"));
    const nomePreferencia = blankToNull(raw("nome_preferencia"));
    const nomeCompleto = [nome, sobrenome].filter(Boolean).join(" ").trim() || nomePreferencia;

    if (!nomeCompleto) {
      return { skip: true, sheetRow: sheetRow, issues: [buildIssue("sem_nome", "Nome ausente")] };
    }

    const phone = normalizePhone(raw("telefone"));
    const phone1 = normalizePhone(raw("contato1_telefone"));
    const phone2 = normalizePhone(raw("contato2_telefone"));
    const phoneResp = normalizePhone(raw("telefone_responsavel"));
    const cpf = normalizeCpf(raw("cpf"));
    const idade = parseIdade(raw("idade"));
    const nasc = toIsoDate(raw("data_nascimento"));
    const submetido = toIsoDateTime(raw("submetido_em"));
    const infoMedicas = blankToNull(raw("info_medicas"));
    const condicoes = blankToNull(raw("condicoes_saude"));
    const detalhe = blankToNull(raw("detalhe_saude"));
    const email = (blankToNull(raw("email")) || "").toLowerCase() || null;
    const tipo = parseTipo(raw("tipo"));
    const menor = idade != null ? idade < 18 : false;
    const nomeResp = blankToNull(raw("nome_responsavel"));

    if (!email) issues.push(buildIssue("email_ausente", "E-mail ausente"));
    if (cpf.present && !cpf.ok) issues.push(buildIssue("cpf_invalido", "CPF inválido ou incompleto"));
    if (blankToNull(raw("telefone")) && !phone.ok) issues.push(buildIssue("telefone_revisar", "Telefone não padronizado"));
    if (blankToNull(raw("contato1_telefone")) && !phone1.ok) issues.push(buildIssue("telefone_contato1_revisar", "Telefone do contato 1 não padronizado"));
    if (blankToNull(raw("telefone_responsavel")) && !phoneResp.ok) issues.push(buildIssue("telefone_resp_revisar", "Telefone do responsável não padronizado"));
    if (menor && !nomeResp) issues.push(buildIssue("menor_sem_responsavel", "Menor de idade sem nome do responsável"));
    if (raw("data_nascimento") && blankToNull(raw("data_nascimento")) && !nasc) {
      issues.push(buildIssue("nascimento_invalida", "Data de nascimento não reconhecida"));
    }
    if (raw("submetido_em") && blankToNull(cellText(raw("submetido_em"))) && !submetido) {
      issues.push(buildIssue("data_envio_invalida", "Data de envio não reconhecida"));
    }

    const contatoLider = phone1.e164 || phone.e164 || "—";
    const contatoResponsavel = phoneResp.e164 || phone1.e164 || phone.e164 || "—";

    return {
      skip: false,
      sheetRow: sheetRow,
      issues: issues,
      existingId: null,
      duplicateBy: null,
      nome: nomeCompleto,
      sobrenome: sobrenome,
      nome_preferencia: nomePreferencia,
      data_nascimento: nasc,
      sexo: blankToNull(raw("sexo")),
      telefone: phone.ok ? phone.e164 : phone.original,
      email: email,
      tamanho_camiseta: blankToNull(raw("tamanho_camiseta")),
      alimentacao: blankToNull(raw("alimentacao")),
      contato1_nome: blankToNull(raw("contato1_nome")),
      contato1_email: (blankToNull(raw("contato1_email")) || "").toLowerCase() || null,
      contato1_telefone: phone1.ok ? phone1.e164 : phone1.original,
      contato2_nome: blankToNull(raw("contato2_nome")),
      contato2_email: (blankToNull(raw("contato2_email")) || "").toLowerCase() || null,
      contato2_telefone: phone2.ok ? phone2.e164 : phone2.original,
      idade: idade,
      submetido_em: submetido,
      situacao: parseSituacao(raw("situacao")),
      tipo: tipo,
      estaca: blankToNull(raw("estaca")) || "—",
      ala: blankToNull(raw("ala")) || "—",
      bispo_email: (blankToNull(raw("bispo_email")) || "").toLowerCase() || null,
      bispo_nome: blankToNull(raw("bispo_nome")),
      apresentacao: blankToNull(raw("apresentacao")),
      membro_igreja: parseMembro(raw("membro_igreja")),
      alerta_saude: isHealthAlert(infoMedicas, condicoes, detalhe),
      menor_idade: menor,
      contato_lider: contatoLider,
      contato_responsavel: contatoResponsavel,
      consultor: "—",
      companhia: null,
      quarto: null,
      observacoes: blankToNull(raw("alimentacao")),
      documento: blankToNull(raw("documento")),
      orgao_emissor: blankToNull(raw("orgao_emissor")),
      cpf: cpf.digits,
      cpf_valido: cpf.present ? cpf.ok : null,
      nome_responsavel: nomeResp,
      telefone_responsavel: phoneResp.ok ? phoneResp.e164 : phoneResp.original,
      autorizacao_pais: parseBoolLoose(raw("autorizacao_pais")),
      info_medicas: infoMedicas,
      condicoes_saude: condicoes,
      detalhe_saude: detalhe,
    };
  }

  function parseMatrix(matrix, mapping) {
    const rows = [];
    const skipped = [];
    for (let i = 1; i < matrix.length; i += 1) {
      const line = matrix[i] || [];
      if (!line.length || line.every(function (c) { return String(c == null ? "" : c).trim() === ""; })) continue;
      const mapped = mapRow(line, mapping, i + 1);
      if (mapped.skip) skipped.push(mapped);
      else rows.push(mapped);
    }

    const seenEmail = {};
    const seenCpf = {};
    rows.forEach(function (row) {
      if (row.email) {
        if (seenEmail[row.email]) {
          row.duplicateBy = "email";
          row.duplicateInFile = true;
          row.issues.push(buildIssue("duplicado_arquivo", "E-mail repetido neste arquivo"));
        } else seenEmail[row.email] = true;
      }
      if (row.cpf && String(row.cpf).length === 11) {
        if (seenCpf[row.cpf]) {
          row.duplicateBy = row.duplicateBy || "cpf";
          row.duplicateInFile = true;
          row.issues.push(buildIssue("duplicado_arquivo", "CPF repetido neste arquivo"));
        } else seenCpf[row.cpf] = true;
      }
    });

    return { rows: rows, skipped: skipped };
  }

  function applyManualMapping(headers, selected) {
    const mapping = {};
    EXPECTED_COLUMNS.forEach(function (col) {
      const idx = selected && selected[col.key] != null ? Number(selected[col.key]) : -1;
      mapping[col.key] = Number.isInteger(idx) ? idx : -1;
    });
    if (Object.keys(selected || {}).length === 0) return autoMapHeaders(headers);
    return mapping;
  }

  function parseInscricaoWorkbook(wb, options) {
    const opts = options || {};
    const sheetName = pickSheetName(wb, opts.sheetName);
    if (!sheetName) throw new Error("A planilha não tem abas.");
    const sheet = wb.Sheets[sheetName];
    const matrix = global.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
    if (!matrix.length) throw new Error("A aba \"" + sheetName + "\" está vazia.");
    const headers = (matrix[0] || []).map(function (h) {
      return String(h == null ? "" : h).trim();
    });
    const mapping = applyManualMapping(headers, opts.mapping);
    const parsed = parseMatrix(matrix, mapping);
    const mappedCount = EXPECTED_COLUMNS.filter(function (c) {
      return mapping[c.key] >= 0;
    }).length;
    return {
      format: "inscricao",
      sheetName: sheetName,
      sheetNames: wb.SheetNames.slice(),
      headers: headers,
      mapping: mapping,
      mappedCount: mappedCount,
      expected: EXPECTED_COLUMNS,
      rows: parsed.rows,
      skipped: parsed.skipped,
    };
  }

  function markDuplicates(rows, existingPublic, existingSensitive) {
    const byEmail = {};
    const byCpf = {};
    (existingPublic || []).forEach(function (p) {
      if (p.email) byEmail[String(p.email).toLowerCase()] = p;
    });
    (existingSensitive || []).forEach(function (s) {
      if (s.cpf && String(s.cpf).length === 11) byCpf[s.cpf] = s;
    });
    rows.forEach(function (row) {
      if (row.email && byEmail[row.email]) {
        row.existingId = byEmail[row.email].id;
        row.duplicateBy = "email";
        row.issues.push(buildIssue("duplicado_base", "Já existe cadastro com este e-mail"));
      } else if (row.cpf && byCpf[row.cpf]) {
        row.existingId = byCpf[row.cpf].participante_id;
        row.duplicateBy = "cpf";
        row.issues.push(buildIssue("duplicado_base", "Já existe cadastro com este CPF"));
      }
    });
    return rows;
  }

  function publicPayload(row) {
    const out = {};
    PUBLIC_KEYS.forEach(function (k) {
      if (row[k] !== undefined) out[k] = row[k];
    });
    return out;
  }

  function sensitivePayload(row) {
    const out = {};
    SENSITIVE_KEYS.forEach(function (k) {
      if (row[k] !== undefined) out[k] = row[k];
    });
    return out;
  }

  function hasSensitiveData(row) {
    return SENSITIVE_KEYS.some(function (k) {
      return row[k] != null && row[k] !== "";
    });
  }

  function summarize(rows, skipped) {
    const withIssues = rows.filter(function (r) { return r.issues.length; });
    return {
      total: rows.length,
      skippedEmpty: (skipped || []).length,
      withIssues: withIssues.length,
      duplicates: rows.filter(function (r) { return r.existingId || r.duplicateInFile; }).length,
      menores: rows.filter(function (r) { return r.menor_idade; }).length,
      consultores: rows.filter(function (r) { return r.tipo === "consultor"; }).length,
      participantes: rows.filter(function (r) { return r.tipo === "participante"; }).length,
    };
  }

  const api = {
    EXPECTED_COLUMNS: EXPECTED_COLUMNS,
    PUBLIC_KEYS: PUBLIC_KEYS,
    SENSITIVE_KEYS: SENSITIVE_KEYS,
    normalizeHeader: normalizeHeader,
    normalizePhone: normalizePhone,
    normalizeCpf: normalizeCpf,
    parseMembro: parseMembro,
    parseSituacao: parseSituacao,
    parseTipo: parseTipo,
    toIsoDate: toIsoDate,
    toIsoDateTime: toIsoDateTime,
    autoMapHeaders: autoMapHeaders,
    pickSheetName: pickSheetName,
    looksLikeInscricao: looksLikeInscricao,
    parseInscricaoWorkbook: parseInscricaoWorkbook,
    markDuplicates: markDuplicates,
    publicPayload: publicPayload,
    sensitivePayload: sensitivePayload,
    hasSensitiveData: hasSensitiveData,
    summarize: summarize,
    blankToNull: blankToNull,
  };

  global.FSYImport = api;
  if (global.FSY) {
    Object.keys(api).forEach(function (k) {
      global.FSY[k] = api[k];
    });
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : global);
