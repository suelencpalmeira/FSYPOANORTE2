const assert = require("assert");
const Imp = require("../js/importPlanilha.js");

assert.strictEqual(Imp.normalizePhone("(81) 99999-0000").e164, "+5581999990000");
assert.strictEqual(Imp.normalizePhone("+55 81 98888-0000").e164, "+5581988880000");
assert.strictEqual(Imp.normalizePhone("81977770000").e164, "+5581977770000");
assert.strictEqual(Imp.normalizePhone("123").ok, false);
assert.strictEqual(Imp.normalizePhone("123").e164, "123");

assert.deepStrictEqual(Imp.normalizeCpf("047.172.560-93").digits, "04717256093");
assert.strictEqual(Imp.normalizeCpf("047.172.560-93").ok, true);
assert.strictEqual(Imp.normalizeCpf("0471725609").ok, false);
assert.strictEqual(Imp.normalizeCpf("").present, false);

assert.strictEqual(Imp.parseMembro("SOU membro de A Igreja de Jesus Cristo dos Santos dos Últimos Dias"), true);
assert.strictEqual(Imp.parseMembro("NÃO sou membro de A Igreja de Jesus Cristo dos Santos dos Últimos Dias"), false);
assert.strictEqual(Imp.parseSituacao("Aprovado"), "aprovado");
assert.strictEqual(Imp.parseSituacao("Aguardando aprovação"), "pendente");
assert.strictEqual(Imp.parseTipo("Consultor"), "consultor");
assert.strictEqual(Imp.parseTipo("Participante"), "participante");
assert.strictEqual(Imp.toIsoDate("2008-03-15"), "2008-03-15");
assert.ok(Imp.toIsoDateTime("17/09/2026, 21:30:05").indexOf("2026-09-17") === 0);

const headers = [
  "Nome",
  "Sobrenome",
  "Nome de preferência",
  "Data de nascimento",
  "Sexo",
  "Telefone",
  "E-mail",
  "Informações médicas",
  "Tamanho da camiseta",
  "Informações sobre alimentação",
  "Nome do contato 1",
  "E-mail para contato 1",
  "Telefone para contato 1",
  "Nome do contato 2",
  "E-mail do contato 2",
  "Telefone para contato 2",
  "Idade",
  "Data",
  "Situação",
  "Tipo",
  "Nome da estaca/distrito",
  "Nome da ala/ramo",
  "E-mail do bispo",
  "Nome do bispo",
  "Número do RG/CIN/Passaporte (Documento com foto)",
  "Órgão emissor",
  "Nome do Responsável",
  "Telefone do Responsável ",
  "Me comprometo a baixar a AUTORIZAÇÃO DOS PAIS para o FSY",
  "CPF",
  "O que vou apresentar? Quanto tempo preciso?",
  "É membro da Igreja?",
  "Nas informações de saúde você relatou alguma destas condições?",
  "Caso tenha selecionado alguma condição de saúde acima, informe melhor neste campo.",
];
const mapping = Imp.autoMapHeaders(headers);
Imp.EXPECTED_COLUMNS.forEach(function (col) {
  assert.ok(mapping[col.key] >= 0, "não mapeou " + col.label);
});
assert.strictEqual(Imp.looksLikeInscricao(mapping), true);

const fakeWb = {
  SheetNames: ["Consultor", "Participante", "Todas"],
  Sheets: {},
};
assert.strictEqual(Imp.pickSheetName(fakeWb), "Todas");

console.log("ok: parser de inscrição");
