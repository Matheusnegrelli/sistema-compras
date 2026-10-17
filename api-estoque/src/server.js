/**
 * API de Estoque Simulada
 *
 * Representa o sistema de estoque (ERP/almoxarifado) do hospital, com os itens de cada setor. A plataforma de
 * compras consulta esta API para obter as quantidades atuais dos produtos, sem digitação
 * manual (RF04 / RNF06). Os dados ficam em data/estoque.json.
 */
const express = require("express");
const fs = require("fs");
const path = require("path");
const dadosIniciais = require("./dados-iniciais");

const PORT = process.env.PORT || 4000;
const API_KEY = process.env.API_KEY || "chave-demo";
const ARQUIVO = process.env.ARQUIVO_DADOS || path.join(__dirname, "..", "data", "estoque.json");

function agora() {
  return new Date().toISOString();
}

// Versão da massa de dados: quando muda, o arquivo salvo é recriado com os dados iniciais
const VERSAO_DADOS = 5;

function carregar() {
  if (fs.existsSync(ARQUIVO)) {
    const salvo = JSON.parse(fs.readFileSync(ARQUIVO, "utf8"));
    if (salvo.versao === VERSAO_DADOS) return salvo.itens;
  }
  return resetar();
}

function salvar(itens) {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify({ versao: VERSAO_DADOS, itens }, null, 2));
}

function resetar() {
  const itens = dadosIniciais.map((i) => ({ ...i, atualizadoEm: agora() }));
  salvar(itens);
  return itens;
}

let estoque = carregar();
const movimentos = [];

const app = express();
app.use(express.json());

// Log simples de cada requisição recebida
app.use((req, _res, next) => {
  console.log(`[${agora()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok", itens: estoque.length, horario: agora() }));

// Autenticação por chave de API (cabeçalho x-api-key)
app.use("/api", (req, res, next) => {
  if (req.get("x-api-key") !== API_KEY) {
    return res.status(401).json({ erro: "Chave de API inválida ou ausente" });
  }
  next();
});

// Lista o estoque; aceita ?setor=Nome do setor para filtrar
app.get("/api/v1/estoque", (req, res) => {
  const itens = req.query.setor ? estoque.filter((i) => i.setor === req.query.setor) : estoque;
  res.json({ geradoEm: agora(), total: itens.length, itens });
});

app.get("/api/v1/estoque/:sku", (req, res) => {
  const item = estoque.find((i) => i.sku === req.params.sku);
  if (!item) return res.status(404).json({ erro: "SKU não encontrado" });
  res.json(item);
});

// Registra entrada ou saída de material (ex.: recebimento de uma compra aprovada)
app.post("/api/v1/estoque/:sku/movimentos", (req, res) => {
  const item = estoque.find((i) => i.sku === req.params.sku);
  if (!item) return res.status(404).json({ erro: "SKU não encontrado" });
  const { tipo, quantidade, motivo } = req.body || {};
  const qtd = Number(quantidade);
  if (!["ENTRADA", "SAIDA"].includes(tipo) || !Number.isFinite(qtd) || qtd <= 0) {
    return res.status(400).json({ erro: "Informe tipo (ENTRADA ou SAIDA) e quantidade > 0" });
  }
  if (tipo === "SAIDA" && qtd > item.quantidade) {
    return res.status(422).json({ erro: "Quantidade de saída maior que o saldo" });
  }
  item.quantidade += tipo === "ENTRADA" ? qtd : -qtd;
  item.atualizadoEm = agora();
  const mov = { sku: item.sku, tipo, quantidade: qtd, motivo: motivo || null, data: item.atualizadoEm };
  movimentos.push(mov);
  salvar(estoque);
  res.status(201).json({ item, movimento: mov });
});

app.get("/api/v1/movimentos", (_req, res) => res.json(movimentos.slice(-100).reverse()));

// Simula o consumo diário do almoxarifado, reduzindo saldos aleatoriamente
app.post("/api/v1/simulacao/consumo", (_req, res) => {
  const alterados = [];
  for (const item of estoque) {
    if (Math.random() < 0.5 || item.quantidade === 0) continue;
    const saida = Math.max(1, Math.round(item.quantidade * (0.1 + Math.random() * 0.4)));
    item.quantidade -= Math.min(saida, item.quantidade);
    item.atualizadoEm = agora();
    alterados.push({ sku: item.sku, saida, saldo: item.quantidade });
    movimentos.push({ sku: item.sku, tipo: "SAIDA", quantidade: saida, motivo: "Consumo simulado", data: item.atualizadoEm });
  }
  salvar(estoque);
  res.json({ alterados });
});

app.post("/api/v1/simulacao/reset", (_req, res) => {
  estoque = resetar();
  movimentos.length = 0;
  res.json({ ok: true, itens: estoque.length });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`API de Estoque simulada em http://localhost:${PORT}`));
}

module.exports = app;
