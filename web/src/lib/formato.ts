export const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dataHora = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }) : "-";

export const data = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "-";

export function duracao(ms: number) {
  const min = ms / 60000;
  if (min < 1) return `${Math.round(ms / 1000)} s`;
  if (min < 60) return `${min.toFixed(1)} min`;
  const h = min / 60;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} dias`;
}

export const ROTULO_STATUS: Record<string, string> = {
  ABERTA: "Aberta",
  EM_COTACAO: "Em cotação",
  ATENDIDA: "Atendida",
  CANCELADA: "Cancelada",
  APROVADA: "Aprovada",
  AUTOMATICA: "Automática",
  MANUAL: "Manual",
  SIMULADA: "Simulada",
  FORNECEDOR: "Pelo fornecedor",
  ENVIADO: "Enviado",
  ENVIANDO: "Enviando…",
  DEMONSTRACAO: "Demonstração",
  FALHOU: "Falhou",
  ADMIN: "Administrador",
  COMPRADOR: "Comprador",
  GESTOR: "Gestor",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

export function formatarCnpj(c: string) {
  return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export const dias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;
