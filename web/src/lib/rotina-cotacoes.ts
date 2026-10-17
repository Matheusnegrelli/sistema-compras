import { prisma } from "./db";
import { enviarEmail } from "./email";
import { dataHora } from "./formato";
import { NOME_SISTEMA } from "./marca";
import { carregarCotacao } from "./consultas";
import { registrarLog } from "./log";
import { NOME_HOSPITAL, urlResposta } from "./solicitacoes";

/** Antecedência do lembrete aos fornecedores que ainda não responderam. */
const LEMBRETE_ANTES_MS = 12 * 3_600_000;
const urlCotacao = (id: number) => `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/cotacoes/${id}`;

/**
 * Rotina das cotações abertas, executada junto com a leitura do estoque e após cada resposta:
 *  - lembra os fornecedores que não responderam quando faltam menos de 12 h para o prazo;
 *  - avisa o comprador quando a cotação está pronta para análise (todos responderam ou o prazo venceu).
 */
export async function verificarCotacoes(agora = new Date()) {
  const abertas = await prisma.cotacao.findMany({
    where: { status: "ABERTA", prazoResposta: { not: null } },
    include: { criadoPor: true, solicitacoes: { include: { fornecedor: true } }, _count: { select: { propostas: true } } },
  });
  let lembretes = 0;
  let avisos = 0;
  for (const c of abertas) {
    const prazo = c.prazoResposta!;
    const pendentes = c.solicitacoes.filter((s) => !s.respondidoEm);

    if (prazo > agora && prazo.getTime() - agora.getTime() <= LEMBRETE_ANTES_MS) {
      for (const s of pendentes.filter((x) => !x.lembreteEm && x.fornecedor.email)) {
        await enviarEmail({
          para: s.fornecedor.email!,
          assunto: `Lembrete: cotação #${c.id} (${c.categoria}) encerra em ${dataHora(prazo)}`,
          corpo: [
            `Olá, ${s.fornecedor.contato || s.fornecedor.nome}.`,
            "",
            `Ainda não recebemos sua proposta para a cotação #${c.id} (${c.categoria}). O prazo termina em ${dataHora(prazo)}.`,
            "Se não tiver os itens, basta clicar em \"Não tenho nenhum destes itens\" no link abaixo:",
            urlResposta(s.token),
            "",
            `Setor de Compras · ${NOME_HOSPITAL}`,
            `Enviado automaticamente pelo ${NOME_SISTEMA}`,
          ].join("\n"),
          solicitacaoId: s.id,
          responderPara: c.criadoPor?.email,
        });
        await prisma.solicitacaoCotacao.update({ where: { id: s.id }, data: { lembreteEm: agora } });
        lembretes++;
      }
    }

    const todosResponderam = c.solicitacoes.length > 0 && pendentes.length === 0;
    if (!c.avisoProntaEm && (todosResponderam || prazo <= agora)) {
      const dados = await carregarCotacao(c.id);
      const melhor = dados?.ranking[0];
      const compradores = c.criadoPorId
        ? await prisma.usuario.findMany({ where: { id: c.criadoPorId, ativo: true } })
        : await prisma.usuario.findMany({ where: { perfil: "COMPRADOR", ativo: true } });
      const respostas = c.solicitacoes.filter((s) => s.respondidoEm).length;
      for (const u of compradores) {
        await enviarEmail({
          para: u.email,
          assunto: melhor
            ? `Cotação #${c.id} (${c.categoria}) pronta para análise · ${c._count.propostas} proposta(s)`
            : `Cotação #${c.id} (${c.categoria}) encerrou sem propostas`,
          corpo: [
            `Olá, ${u.nome}.`,
            "",
            todosResponderam ? "Todos os fornecedores convidados responderam." : `O prazo de resposta terminou em ${dataHora(prazo)}.`,
            `Respostas: ${respostas} de ${c.solicitacoes.length} fornecedor(es) · ${c._count.propostas} proposta(s) com preço.`,
            melhor ? `Recomendação do sistema: ${melhor.fornecedor} (${melhor.pontuacao.toFixed(1)} pts).` : "Nenhum fornecedor enviou preço. Reenvie a cotação ou registre propostas manualmente.",
            "",
            "Analise o comparativo e selecione a proposta:",
            urlCotacao(c.id),
            "",
            `Enviado automaticamente pelo ${NOME_SISTEMA}`,
          ].join("\n"),
        });
      }
      await prisma.cotacao.update({ where: { id: c.id }, data: { avisoProntaEm: agora } });
      await registrarLog(null, "COTACAO_PRONTA", "Cotacao", c.id, todosResponderam ? "todos responderam" : "prazo encerrado");
      avisos++;
    }
  }
  return { lembretes, avisos };
}
