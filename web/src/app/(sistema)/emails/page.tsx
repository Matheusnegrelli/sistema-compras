import { prisma } from "@/lib/db";
import { provedorEmail } from "@/lib/email";
import { Aviso, Cabecalho, Status, Vazio } from "@/components/ui";
import { reenviarEmailAcao } from "@/acoes/emails";
import { dataHora } from "@/lib/formato";
import { emailHtml } from "@/lib/email-html";
import { NOME_HOSPITAL } from "@/lib/marca";

export default async function Emails({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const emails = await prisma.emailEnviado.findMany({ orderBy: { enviadoEm: "desc" }, take: 100 });
  return (
    <div>
      <Cabecalho titulo="E-mails enviados" descricao="Tudo o que o sistema envia por e-mail: pedidos de cotação, pedidos de compra, dados para pagamento e confirmações aos fornecedores" />
      <Aviso searchParams={searchParams} />
      {provedorEmail() && (
        <p className="mb-4 text-sm text-slate-500">
          Envio real ativo pelo {provedorEmail() === "RESEND" ? "Resend (API)" : "servidor SMTP"}{process.env.EMAIL_TESTE ? ` · todos os e-mails são desviados para ${process.env.EMAIL_TESTE}` : ""}.
          Os e-mails saem em segundo plano: atualize a página para ver o status mudar de &quot;Enviando…&quot; para &quot;Enviado&quot;.
        </p>
      )}
      {!provedorEmail() && (
        <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Modo demonstração: nenhum serviço de e-mail (Resend ou SMTP) está configurado, então as mensagens ficam registradas aqui sem sair do sistema.
          Para enviar de verdade, configure <code>RESEND_API_KEY</code> ou as variáveis SMTP. Abra um e-mail para ver como ele chega ao destinatário.
        </div>
      )}
      {emails.length === 0 ? (
        <div className="card"><Vazio>Nenhum e-mail enviado ainda.</Vazio></div>
      ) : (
        <div className="space-y-3">
          {emails.map((e) => (
            <details key={e.id} className="card">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                <Status valor={e.status} />
                <span className="font-medium">{e.assunto}</span>
                <span className="text-slate-500">para {e.para}</span>
                <span className="ml-auto text-xs text-slate-400">{dataHora(e.enviadoEm)}</span>
              </summary>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>Para: <strong className="text-slate-700">{e.para}</strong></span>
                {e.responderPara && <span>Respostas vão para: <strong className="text-slate-700">{e.responderPara}</strong></span>}
                {e.anexo && (
                  <span>
                    📎 Anexo:{" "}
                    {e.anexo.match(/pedido-de-compra-(\d+)\.pdf/) ? (
                      <a className="link" href={`/cotacoes/${e.anexo.match(/pedido-de-compra-(\d+)\.pdf/)![1]}/pedido/pdf`} target="_blank" rel="noreferrer">{e.anexo}</a>
                    ) : e.anexo}
                  </span>
                )}
              </div>
              {e.erro && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">Erro: {e.erro}</p>}
              {provedorEmail() && (e.status === "FALHOU" || e.status === "ENVIANDO") && (
                <form action={reenviarEmailAcao} className="mt-2">
                  <input type="hidden" name="id" value={e.id} />
                  <button className="btn-secundario">↻ Reenviar este e-mail</button>
                </form>
              )}
              {/* Prévia: o mesmo HTML que chega na caixa de entrada do destinatário */}
              <iframe
                title={`Prévia: ${e.assunto}`}
                srcDoc={emailHtml(e.assunto, e.corpo, NOME_HOSPITAL)}
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                className="mt-3 h-[720px] w-full rounded-lg border border-slate-200 bg-slate-100"
              />
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
