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
  { sku: "FAR-002", nome: "Soro fisiológico 0,9% 500ml", unidade: "FR", setor: "FAR", categoria: "Medicamento", criticidade: "ALTA", estoqueMinimo: 400, estoqueInicial: 520, precoReferencia: 4.2 },
  { sku: "FAR-003", nome: "Omeprazol 40mg injetável", unidade: "FA", setor: "FAR", categoria: "Medicamento", criticidade: "MEDIA", estoqueMinimo: 60, estoqueInicial: 90, precoReferencia: 9.8 },
  { sku: "FAR-004", nome: "Heparina sódica 5.000UI/ml 5ml", unidade: "FA", setor: "FAR", categoria: "Medicamento", criticidade: "ALTA", estoqueMinimo: 40, estoqueInicial: 25, precoReferencia: 18.5 },
  { sku: "UTI-001", nome: "Cateter venoso central duplo lúmen", unidade: "UN", setor: "UTI", categoria: "Material médico-hospitalar", criticidade: "ALTA", estoqueMinimo: 10, estoqueInicial: 6, precoReferencia: 98 },
  { sku: "UTI-002", nome: "Equipo para bomba de infusão", unidade: "UN", setor: "UTI", categoria: "Material médico-hospitalar", criticidade: "ALTA", estoqueMinimo: 100, estoqueInicial: 140, precoReferencia: 22.9 },
  { sku: "UTI-003", nome: "Sonda de aspiração traqueal nº 12", unidade: "UN", setor: "UTI", categoria: "Material médico-hospitalar", criticidade: "MEDIA", estoqueMinimo: 150, estoqueInicial: 210, precoReferencia: 1.35 },
  { sku: "CC-001", nome: "Fio de sutura nylon 3-0", unidade: "ENV", setor: "CC", categoria: "Material médico-hospitalar", criticidade: "ALTA", estoqueMinimo: 60, estoqueInicial: 48, precoReferencia: 6.7 },
  { sku: "CC-002", nome: "Avental cirúrgico descartável estéril", unidade: "UN", setor: "CC", categoria: "EPI", criticidade: "MEDIA", estoqueMinimo: 120, estoqueInicial: 150, precoReferencia: 14.5 },
  { sku: "CC-003", nome: "Compressa de gaze estéril 7,5x7,5 (pct 10)", unidade: "PCT", setor: "CC", categoria: "Material médico-hospitalar", criticidade: "MEDIA", estoqueMinimo: 400, estoqueInicial: 600, precoReferencia: 0.95 },
  { sku: "PS-001", nome: "Seringa descartável 10ml", unidade: "UN", setor: "PS", categoria: "Material médico-hospitalar", criticidade: "ALTA", estoqueMinimo: 1000, estoqueInicial: 800, precoReferencia: 0.55 },
  { sku: "PS-002", nome: "Agulha hipodérmica 25x7", unidade: "UN", setor: "PS", categoria: "Material médico-hospitalar", criticidade: "MEDIA", estoqueMinimo: 1000, estoqueInicial: 1500, precoReferencia: 0.18 },
  { sku: "PS-003", nome: "Luva de procedimento M (cx 100)", unidade: "CX", setor: "PS", categoria: "EPI", criticidade: "ALTA", estoqueMinimo: 60, estoqueInicial: 35, precoReferencia: 32 },
  { sku: "INT-001", nome: "Fralda geriátrica G (pct 8)", unidade: "PCT", setor: "INT", categoria: "Higiene do paciente", criticidade: "MEDIA", estoqueMinimo: 80, estoqueInicial: 90, precoReferencia: 21 },
  { sku: "INT-002", nome: "Curativo filme transparente 6x7cm", unidade: "UN", setor: "INT", categoria: "Material médico-hospitalar", criticidade: "BAIXA", estoqueMinimo: 200, estoqueInicial: 150, precoReferencia: 3.1 },
  { sku: "LAB-001", nome: "Tubo de coleta a vácuo EDTA 4ml (cx 100)", unidade: "CX", setor: "LAB", categoria: "Laboratório", criticidade: "ALTA", estoqueMinimo: 12, estoqueInicial: 8, precoReferencia: 68 },
  { sku: "LAB-002", nome: "Reagente glicose enzimática 500ml", unidade: "FR", setor: "LAB", categoria: "Laboratório", criticidade: "MEDIA", estoqueMinimo: 6, estoqueInicial: 10, precoReferencia: 145 },
  { sku: "NUT-001", nome: "Dieta enteral polimérica 1L", unidade: "UN", setor: "NUT", categoria: "Nutrição", criticidade: "ALTA", estoqueMinimo: 100, estoqueInicial: 70, precoReferencia: 29.9 },
  { sku: "NUT-002", nome: "Copo descartável 200ml (cento)", unidade: "PCT", setor: "NUT", categoria: "Descartáveis", criticidade: "BAIXA", estoqueMinimo: 30, estoqueInicial: 40, precoReferencia: 6.4 },
  { sku: "HIG-001", nome: "Álcool 70% 1L", unidade: "UN", setor: "HIG", categoria: "Limpeza e desinfecção", criticidade: "MEDIA", estoqueMinimo: 80, estoqueInicial: 85, precoReferencia: 9.9 },
  { sku: "HIG-002", nome: "Hipoclorito de sódio 1% 5L", unidade: "GL", setor: "HIG", categoria: "Limpeza e desinfecção", criticidade: "MEDIA", estoqueMinimo: 20, estoqueInicial: 14, precoReferencia: 18 },
  { sku: "HIG-003", nome: "Saco de lixo infectante branco 100L (pct 100)", unidade: "PCT", setor: "HIG", categoria: "Resíduos de saúde", criticidade: "ALTA", estoqueMinimo: 15, estoqueInicial: 12, precoReferencia: 89 },
  { sku: "ADM-001", nome: "Papel sulfite A4 (resma 500 fls)", unidade: "RESMA", setor: "ADM", categoria: "Escritório", criticidade: "BAIXA", estoqueMinimo: 20, estoqueInicial: 30, precoReferencia: 27.9 },
  { sku: "ADM-002", nome: "Pulseira de identificação de paciente (pct 100)", unidade: "PCT", setor: "ADM", categoria: "Escritório", criticidade: "MEDIA", estoqueMinimo: 10, estoqueInicial: 7, precoReferencia: 35 },
];

export const fornecedores = [
  { nome: "Medfarma Distribuidora Hospitalar", cnpj: "12345678000101", email: "vendas@medfarma.com.br", telefone: "(27) 3721-1000", contato: "Ana Souza", notaHistorico: 4.6 },
  { nome: "Vitória Cirúrgica Ltda", cnpj: "23456789000102", email: "comercial@vitoriacirurgica.com.br", telefone: "(27) 3722-2000", contato: "Carlos Lima", notaHistorico: 4.1 },
  { nome: "Hospimed Atacado Online", cnpj: "34567890000103", email: "cotacao@hospimed.com.br", telefone: "(11) 4000-3000", contato: "Fernanda Reis", notaHistorico: 3.2 },
  { nome: "Capixaba Produtos Médicos", cnpj: "45678901000104", email: "pedidos@capixabamed.com.br", telefone: "(27) 3724-4000", contato: "João Pedro", notaHistorico: 3.8 },
  { nome: "PreçoBom Medical Supply", cnpj: "56789012000105", email: "b2b@precobommed.com.br", telefone: "(11) 4000-5000", contato: "Mariana Alves", notaHistorico: 2.3 },
  { nome: "Colatina Saúde Distribuidora", cnpj: "67890123000106", email: "loja@colatinasaude.com.br", telefone: "(27) 3725-6000", contato: "Ricardo Gomes", notaHistorico: 4.9 },
];
