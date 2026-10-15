import { prisma } from "@/lib/db";
import { emailReal } from "@/lib/email";
import { Cabecalho, Status, Vazio } from "@/components/ui";
import { dataHora } from "@/lib/formato";

export default async function Emails() {
  const emails = await prisma.emailEnviado.findMany({ orderBy: { enviadoEm: "desc" }, take: 100 });
  return (
    <div>
      <Cabecalho titulo="E-mails enviados" descricao="Pedidos de cotação enviados automaticamente aos fornecedores" />
      {!emailReal() && (
        <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Modo demonstração: nenhum servidor de e-mail (SMTP) está configurado, então as mensagens ficam registradas aqui sem sair do sistema.
          Para enviar de verdade, preencha as variáveis SMTP no arquivo <code>.env</code>.
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
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 font-sans text-sm text-slate-700">
                {e.corpo.split(/(https?:\/\/\S+)/).map((parte, i) =>
                  /^https?:\/\//.test(parte) ? <a key={i} className="link" href={parte} target="_blank" rel="noreferrer">{parte}</a> : parte,
                )}
              </pre>
              {e.erro && <p className="mt-2 text-xs text-red-700">Erro: {e.erro}</p>}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
