import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "./db";
import { emailHtml } from "./email-html";
import { NOME_HOSPITAL, NOME_SISTEMA } from "./marca";

type Anexo = { nome: string; conteudo: Buffer };
type Email = { para: string; assunto: string; corpo: string; solicitacaoId?: number; responderPara?: string | null; anexos?: Anexo[] };
type Mensagem = { para: string; assunto: string; texto: string; html: string; responderPara?: string; anexos: Anexo[] };

let transporte: Transporter | null | undefined;

/** Servidor SMTP do .env (uso local). Em hospedagens que bloqueiam SMTP, use o Resend (RESEND_API_KEY). */
function obterTransporte() {
  if (transporte !== undefined) return transporte;
  const host = process.env.SMTP_HOST;
  transporte = host
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USUARIO ? { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_SENHA } : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      })
    : null;
  return transporte;
}

/** Qual serviço envia de verdade: Resend (API HTTPS), SMTP ou nenhum (modo demonstração). */
export function provedorEmail(): "RESEND" | "SMTP" | null {
  if (process.env.RESEND_API_KEY) return "RESEND";
  if (process.env.SMTP_HOST) return "SMTP";
  return null;
}

export function emailReal() {
  return provedorEmail() !== null;
}

/** Envio pela API do Resend: usa a porta 443 (HTTPS), que o plano grátis do Render não bloqueia. */
async function enviarPeloResend(m: Mensagem) {
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_REMETENTE || `${NOME_SISTEMA} <onboarding@resend.dev>`,
      to: [m.para],
      subject: m.assunto,
      text: m.texto,
      html: m.html,
      reply_to: m.responderPara,
      attachments: m.anexos.map((a) => ({ filename: a.nome, content: a.conteudo.toString("base64") })),
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!resposta.ok) throw new Error(`Resend ${resposta.status}: ${(await resposta.text()).slice(0, 300)}`);
}

async function enviarPorSmtp(m: Mensagem) {
  await obterTransporte()!.sendMail({
    from: process.env.SMTP_REMETENTE || process.env.SMTP_USUARIO,
    to: m.para,
    subject: m.assunto,
    replyTo: m.responderPara,
    text: m.texto,
    html: m.html,
    attachments: m.anexos.map((a) => ({ filename: a.nome, content: a.conteudo, contentType: "application/pdf" })),
  });
}

/** Entrega a mensagem e atualiza o registro na caixa de saída (roda em segundo plano). */
async function entregar(id: number, m: Mensagem) {
  try {
    await (provedorEmail() === "RESEND" ? enviarPeloResend(m) : enviarPorSmtp(m));
    await prisma.emailEnviado.update({ where: { id }, data: { status: "ENVIADO", erro: null } });
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    console.error(`Falha ao enviar o e-mail ${id}:`, erro);
    await prisma.emailEnviado.update({ where: { id }, data: { status: "FALHOU", erro } }).catch(() => {});
  }
}

/**
 * Registra o e-mail na caixa de saída do sistema e envia em segundo plano, para a tela
 * responder na hora mesmo quando o servidor de e-mail demora (o status muda para Enviado ou Falhou).
 */
export async function enviarEmail({ para, assunto, corpo, solicitacaoId, responderPara, anexos = [] }: Email) {
  const real = emailReal();
  const registro = await prisma.emailEnviado.create({
    data: {
      para, assunto, corpo, solicitacaoId,
      status: real ? "ENVIANDO" : "DEMONSTRACAO",
      responderPara: responderPara || null,
      anexo: anexos.map((a) => a.nome).join(", ") || null,
    },
  });
  if (real) {
    // EMAIL_TESTE desvia todos os envios para um único endereço (apresentação sem contatar empresas reais)
    const teste = process.env.EMAIL_TESTE;
    void entregar(registro.id, {
      para: teste || para,
      assunto: teste ? `[para ${para}] ${assunto}` : assunto,
      texto: corpo,
      html: emailHtml(assunto, corpo, NOME_HOSPITAL),
      responderPara: responderPara || undefined,
      anexos,
    });
  }
  return registro;
}
