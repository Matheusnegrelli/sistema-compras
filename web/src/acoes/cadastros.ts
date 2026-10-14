"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { registrarLog } from "@/lib/log";
import { falhar, numero, sucesso, texto } from "./util";

// ---------- Produtos (RF01, RF03) ----------
export async function salvarProduto(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const id = Number(fd.get("id") || 0);
  const volta = id ? `/produtos/${id}` : "/produtos/novo";
  const sku = texto(fd, "sku").toUpperCase();
  const nome = texto(fd, "nome");
  const estoqueMinimo = numero(fd, "estoqueMinimo");
  const reposicao = numero(fd, "quantidadeReposicao");
  const preco = numero(fd, "precoReferencia");
  if (!sku || !nome) falhar(volta, "Informe SKU e nome do produto");
  if (!Number.isInteger(estoqueMinimo) || estoqueMinimo < 0) falhar(volta, "Estoque mínimo deve ser um número inteiro maior ou igual a zero");
  const duplicado = await prisma.produto.findFirst({ where: { sku, NOT: { id } } });
  if (duplicado) falhar(volta, `Já existe um produto com o SKU ${sku}`);

  const dados = {
    sku,
    nome,
    unidade: texto(fd, "unidade").toUpperCase() || "UN",
    estoqueMinimo,
    quantidadeReposicao: Number.isInteger(reposicao) && reposicao > 0 ? reposicao : null,
    precoReferencia: Number.isFinite(preco) && preco > 0 ? preco : null,
    ativo: fd.get("ativo") === "on",
  };
  const produto = id
    ? await prisma.produto.update({ where: { id }, data: dados })
    : await prisma.produto.create({ data: dados });
  await registrarLog(sessao.id, id ? "PRODUTO_ALTERADO" : "PRODUTO_CRIADO", "Produto", produto.id, `${sku} mínimo ${estoqueMinimo}`);
  revalidatePath("/produtos");
  sucesso("/produtos", `Produto ${sku} salvo`);
}

// ---------- Fornecedores (RF02) ----------
export async function salvarFornecedor(fd: FormData) {
  const sessao = await exigirSessao("COMPRADOR");
  const id = Number(fd.get("id") || 0);
  const volta = id ? `/fornecedores/${id}` : "/fornecedores/novo";
  const nome = texto(fd, "nome");
  const cnpj = texto(fd, "cnpj").replace(/\D/g, "");
  const nota = numero(fd, "notaHistorico");
  if (!nome) falhar(volta, "Informe o nome do fornecedor");
  if (cnpj.length !== 14) falhar(volta, "CNPJ deve ter 14 dígitos");
  if (!Number.isFinite(nota) || nota < 0 || nota > 5) falhar(volta, "A nota de histórico deve ficar entre 0 e 5");
  const duplicado = await prisma.fornecedor.findFirst({ where: { cnpj, NOT: { id } } });
  if (duplicado) falhar(volta, "Já existe um fornecedor com este CNPJ");

  const dados = {
    nome,
    cnpj,
    email: texto(fd, "email") || null,
    telefone: texto(fd, "telefone") || null,
    contato: texto(fd, "contato") || null,
    notaHistorico: nota,
    ativo: fd.get("ativo") === "on",
  };
  const fornecedor = id
    ? await prisma.fornecedor.update({ where: { id }, data: dados })
    : await prisma.fornecedor.create({ data: dados });
  await registrarLog(sessao.id, id ? "FORNECEDOR_ALTERADO" : "FORNECEDOR_CRIADO", "Fornecedor", fornecedor.id, nome);
  revalidatePath("/fornecedores");
  sucesso("/fornecedores", `Fornecedor ${nome} salvo`);
}

// ---------- Usuários ----------
export async function salvarUsuario(fd: FormData) {
  const sessao = await exigirSessao();
  if (sessao.perfil !== "ADMIN") falhar("/usuarios", "Apenas administradores gerenciam usuários");
  const id = Number(fd.get("id") || 0);
  const nome = texto(fd, "nome");
  const email = texto(fd, "email").toLowerCase();
  const senha = texto(fd, "senha");
  const perfil = texto(fd, "perfil") as "ADMIN" | "COMPRADOR" | "GESTOR";
  if (!nome || !email.includes("@")) falhar("/usuarios", "Informe nome e e-mail válidos");
  if (!["ADMIN", "COMPRADOR", "GESTOR"].includes(perfil)) falhar("/usuarios", "Perfil inválido");
  if (!id && senha.length < 6) falhar("/usuarios", "A senha deve ter ao menos 6 caracteres");
  const duplicado = await prisma.usuario.findFirst({ where: { email, NOT: { id } } });
  if (duplicado) falhar("/usuarios", "E-mail já cadastrado");

  const dados = { nome, email, perfil, ativo: id ? fd.get("ativo") === "on" : true, ...(senha ? { senhaHash: await bcrypt.hash(senha, 10) } : {}) };
  const usuario = id
    ? await prisma.usuario.update({ where: { id }, data: dados })
    : await prisma.usuario.create({ data: { ...dados, senhaHash: dados.senhaHash! } });
  await registrarLog(sessao.id, id ? "USUARIO_ALTERADO" : "USUARIO_CRIADO", "Usuario", usuario.id, `${email} (${perfil})`);
  revalidatePath("/usuarios");
  sucesso("/usuarios", `Usuário ${email} salvo`);
}

// ---------- Pesos do algoritmo ----------
export async function salvarPesos(fd: FormData) {
  const sessao = await exigirSessao("GESTOR");
  const pesos = {
    preco: numero(fd, "preco"),
    prazo: numero(fd, "prazo"),
    disponibilidade: numero(fd, "disponibilidade"),
    historico: numero(fd, "historico"),
  };
  if (Object.values(pesos).some((v) => !Number.isFinite(v) || v < 0)) falhar("/configuracoes", "Pesos devem ser números positivos");
  const soma = Object.values(pesos).reduce((a, b) => a + b, 0);
  if (Math.round(soma) !== 100) falhar("/configuracoes", `A soma dos pesos deve ser 100% (atual: ${soma}%)`);
  await prisma.configuracaoPesos.upsert({ where: { id: 1 }, create: { id: 1, ...pesos }, update: pesos });
  await registrarLog(sessao.id, "PESOS_ALTERADOS", "ConfiguracaoPesos", 1, JSON.stringify(pesos));
  sucesso("/configuracoes", "Pesos atualizados");
}
