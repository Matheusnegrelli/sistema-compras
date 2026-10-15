/** Dados fictícios de um hospital, compartilhados pelo seed e pela API de estoque simulada. */
export const setores = [
  { sigla: "FAR", nome: "Farmácia Hospitalar", responsavel: "Farm. Juliana Prates" },
  { sigla: "UTI", nome: "UTI Adulto", responsavel: "Enf. Ricardo Lemos" },
  { sigla: "CC", nome: "Centro Cirúrgico", responsavel: "Enf. Patrícia Gomes" },
  { sigla: "PS", nome: "Pronto-Socorro", responsavel: "Enf. Bruno Saraiva" },
  { sigla: "INT", nome: "Internação / Enfermaria", responsavel: "Enf. Camila Rocha" },
  { sigla: "LAB", nome: "Laboratório de Análises Clínicas", responsavel: "Biom. André Falcão" },
  { sigla: "NUT", nome: "Nutrição e Dietética", responsavel: "Nutr. Larissa Mendes" },
  { sigla: "HIG", nome: "Higienização e Limpeza", responsavel: "Sup. Marcos Vieira" },
  { sigla: "ADM", nome: "Administrativo", responsavel: "Adm. Sônia Ribeiro" },
];

type Crit = "ALTA" | "MEDIA" | "BAIXA";

export const produtos: {
  sku: string; nome: string; unidade: string; setor: string; categoria: string; criticidade: Crit;
  estoqueMinimo: number; estoqueInicial: number; precoReferencia: number;
}[] = [
  { sku: "FAR-001", nome: "Dipirona sódica 500mg/ml ampola 2ml", unidade: "AMP", setor: "FAR", categoria: "Medicamento", criticidade: "ALTA", estoqueMinimo: 300, estoqueInicial: 180, precoReferencia: 1.15 },
  { sku: "FAR-003", nome: "Omeprazol 40mg injetável", unidade: "FA", setor: "FAR", categoria: "Medicamento", criticidade: "MEDIA", estoqueMinimo: 60, estoqueInicial: 90, precoReferencia: 9.8 },
  { sku: "UTI-001", nome: "Cateter venoso central duplo lúmen", unidade: "UN", setor: "UTI", categoria: "Material médico-hospitalar", criticidade: "ALTA", estoqueMinimo: 10, estoqueInicial: 6, precoReferencia: 98 },
  { sku: "UTI-002", nome: "Equipo para bomba de infusão", unidade: "UN", setor: "UTI", categoria: "Material médico-hospitalar", criticidade: "ALTA", estoqueMinimo: 100, estoqueInicial: 140, precoReferencia: 22.9 },
  { sku: "CC-002", nome: "Avental cirúrgico descartável estéril", unidade: "UN", setor: "CC", categoria: "EPI", criticidade: "MEDIA", estoqueMinimo: 120, estoqueInicial: 150, precoReferencia: 14.5 },
  { sku: "PS-003", nome: "Luva de procedimento M (cx 100)", unidade: "CX", setor: "PS", categoria: "EPI", criticidade: "ALTA", estoqueMinimo: 60, estoqueInicial: 35, precoReferencia: 32 },
  { sku: "INT-001", nome: "Fralda geriátrica G (pct 8)", unidade: "PCT", setor: "INT", categoria: "Higiene do paciente", criticidade: "MEDIA", estoqueMinimo: 80, estoqueInicial: 90, precoReferencia: 21 },
  { sku: "LAB-001", nome: "Tubo de coleta a vácuo EDTA 4ml (cx 100)", unidade: "CX", setor: "LAB", categoria: "Laboratório", criticidade: "ALTA", estoqueMinimo: 12, estoqueInicial: 8, precoReferencia: 68 },
  { sku: "LAB-002", nome: "Reagente glicose enzimática 500ml", unidade: "FR", setor: "LAB", categoria: "Laboratório", criticidade: "MEDIA", estoqueMinimo: 6, estoqueInicial: 10, precoReferencia: 145 },
  { sku: "NUT-001", nome: "Dieta enteral polimérica 1L", unidade: "UN", setor: "NUT", categoria: "Nutrição", criticidade: "ALTA", estoqueMinimo: 100, estoqueInicial: 120, precoReferencia: 29.9 },
  { sku: "HIG-002", nome: "Hipoclorito de sódio 1% 5L", unidade: "GL", setor: "HIG", categoria: "Limpeza e desinfecção", criticidade: "MEDIA", estoqueMinimo: 20, estoqueInicial: 26, precoReferencia: 18 },
  { sku: "ADM-002", nome: "Pulseira de identificação de paciente (pct 100)", unidade: "PCT", setor: "ADM", categoria: "Escritório", criticidade: "MEDIA", estoqueMinimo: 10, estoqueInicial: 15, precoReferencia: 35 },
];

export const fornecedores = [
  { nome: "Medfarma Distribuidora Hospitalar", cnpj: "12345678000101", email: "vendas@medfarma.com.br", telefone: "(27) 3721-1000", contato: "Ana Souza", notaHistorico: 4.6 },
  { nome: "Vitória Cirúrgica Ltda", cnpj: "23456789000102", email: "comercial@vitoriacirurgica.com.br", telefone: "(27) 3722-2000", contato: "Carlos Lima", notaHistorico: 4.1 },
  { nome: "Hospimed Atacado Online", cnpj: "34567890000103", email: "cotacao@hospimed.com.br", telefone: "(11) 4000-3000", contato: "Fernanda Reis", notaHistorico: 3.2 },
  { nome: "Capixaba Produtos Médicos", cnpj: "45678901000104", email: "pedidos@capixabamed.com.br", telefone: "(27) 3724-4000", contato: "João Pedro", notaHistorico: 3.8 },
  { nome: "PreçoBom Medical Supply", cnpj: "56789012000105", email: "b2b@precobommed.com.br", telefone: "(11) 4000-5000", contato: "Mariana Alves", notaHistorico: 2.3 },
  { nome: "Colatina Saúde Distribuidora", cnpj: "67890123000106", email: "loja@colatinasaude.com.br", telefone: "(27) 3725-6000", contato: "Ricardo Gomes", notaHistorico: 4.9 },
];
