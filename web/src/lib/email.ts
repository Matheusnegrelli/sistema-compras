import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "./db";
import { emailHtml } from "./email-html";
import { NOME_HOSPITAL } from "./marca";

type Anexo = { nome: string; conteudo: Buffer };
type Email = { para: string; assunto: string; corpo: string; solicitacaoId?: number; responderPara?: string | null; anexos?: Anexo[] };

let transporte: Transporter | null | undefined;

/** Usa o servidor SMTP do .env; sem SMTP_HOST o sistema roda em modo demonstração (só caixa de saída). */
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
      })
    : null;
  return transporte;
}

export function emailReal() {
  return Boolean(process.env.SMTP_HOST);
}

/** Envia o e-mail e registra na caixa de saída do sistema, com sucesso ou falha. */
export async function enviarEmail({ para, assunto, corpo, solicitacaoId, responderPara, anexos = [] }: Email) {
  const t = obterTransporte();
  let status: "ENVIADO" | "DEMONSTRACAO" | "FALHOU" = "DEMONSTRACAO";
  let erro: string | null = null;
  if (t) {
    // EMAIL_TESTE desvia todos os envios para um único endereço (apresentação sem contatar empresas reais)
    const teste = process.env.EMAIL_TESTE;
    try {
      await t.sendMail({
        from: process.env.SMTP_REMETENTE || process.env.SMTP_USUARIO,
        to: teste || para,
        subject: teste ? `[para ${para}] ${assunto}` : assunto,
        replyTo: responderPara || undefined,
        text: corpo,
        html: emailHtml(assunto, corpo, NOME_HOSPITAL),
        attachments: anexos.map((a) => ({ filename: a.nome, content: a.conteudo, contentType: "application/pdf" })),
      });
      status = "ENVIADO";
    } catch (e) {
      status = "FALHOU";
      erro = e instanceof Error ? e.message : String(e);
    }
  }
  return prisma.emailEnviado.create({
    data: { para, assunto, corpo, status, erro, solicitacaoId, responderPara: responderPara || null, anexo: anexos.map((a) => a.nome).join(", ") || null },
  });
}
