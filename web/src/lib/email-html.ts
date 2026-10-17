import { NOME_SISTEMA, SUBTITULO_SISTEMA } from "./marca";

/**
 * Monta a versão HTML do e-mail a partir do corpo em texto, para os e-mails terem a identidade
 * visual do sistema sem duplicar cada modelo. Convenções do texto:
 * - linha só com um link        -> botão
 * - linha EM MAIÚSCULAS          -> título de seção
 * - linhas "  - item ... = valor" -> tabela de itens (valor alinhado à direita)
 * - linhas recuadas "  texto"    -> caixa de detalhes
 * - "Rótulo: valor"              -> rótulo em negrito
 * - assinatura (Setor de Compras, Comprador responsável, Enviado automaticamente) -> rodapé
 * O texto puro continua sendo enviado junto, para leitores que não exibem HTML.
 */

const COR = { marca: "#154c47", marcaClara: "#eef7f5", borda: "#e2e8f0", texto: "#1e293b", suave: "#64748b", destaque: "#059669" };
const FONTE = "font-family:Segoe UI,Helvetica,Arial,sans-serif";

const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function rotuloDoBotao(url: string) {
  if (url.includes("/responder/")) return "Responder cotação";
  if (url.includes("/cotacoes/")) return `Abrir no ${NOME_SISTEMA}`;
  return "Abrir link";
}

const ehRodape = (l: string) => /^(Setor de Compras|Comprador responsável|Enviado automaticamente)/.test(l);
const ehTitulo = (l: string) => l.length > 2 && l.length < 60 && l === l.toUpperCase() && /[A-ZÀ-Ú]/.test(l);

/** Negrita o rótulo de linhas "Rótulo: valor" e destaca o valor total. */
function linhaComRotulo(l: string) {
  const m = l.match(/^([A-ZÀ-Úa-zà-ú][^:.!?]{1,34}):\s(.+)$/);
  if (!m || /^https?/.test(m[2])) return escapar(l);
  const total = /^valor total/i.test(m[1]);
  return `<strong>${escapar(m[1])}:</strong> <span style="${total ? `color:${COR.destaque};font-weight:700;font-size:16px` : ""}">${escapar(m[2])}</span>`;
}

function tabelaItens(linhas: string[]) {
  const celula = `padding:8px 10px;border-bottom:1px solid ${COR.borda};font-size:14px`;
  const linhasHtml = linhas.map((l) => {
    const t = l.replace(/^\s*-\s*/, "");
    const [desc, valor] = t.includes(" = ") ? [t.slice(0, t.lastIndexOf(" = ")), t.slice(t.lastIndexOf(" = ") + 3)] : [t, ""];
    return `<tr><td style="${celula}">${escapar(desc)}</td><td style="${celula};text-align:right;white-space:nowrap;font-weight:600">${escapar(valor)}</td></tr>`;
  });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COR.borda};border-radius:8px;border-collapse:separate;margin:4px 0 14px">${linhasHtml.join("")}</table>`;
}

export function emailHtml(assunto: string, corpo: string, hospital: string) {
  const linhas = corpo.split("\n");
  const blocos: string[] = [];
  const rodape: string[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const t = l.trim();
    if (!t) continue;
    if (ehRodape(t)) { rodape.push(escapar(t)); continue; }
    if (/^https?:\/\/\S+$/.test(t)) {
      blocos.push(`<p style="margin:18px 0"><a href="${escapar(t)}" style="display:inline-block;background:${COR.marca};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;font-size:15px">${rotuloDoBotao(t)} &rarr;</a></p>`
        + `<p style="margin:-8px 0 14px;font-size:12px;color:${COR.suave}">Se o botão não abrir, copie este endereço: <a href="${escapar(t)}" style="color:${COR.marca}">${escapar(t)}</a></p>`);
      continue;
    }
    if (/^\s*-\s/.test(l)) {
      const grupo = [l];
      while (i + 1 < linhas.length && /^\s*-\s/.test(linhas[i + 1])) grupo.push(linhas[++i]);
      blocos.push(tabelaItens(grupo));
      continue;
    }
    if (/^\s{2,}\S/.test(l)) {
      const grupo = [t];
      while (i + 1 < linhas.length && /^\s{2,}\S/.test(linhas[i + 1]) && !/^\s*-\s/.test(linhas[i + 1])) grupo.push(linhas[++i].trim());
      blocos.push(`<div style="background:${COR.marcaClara};border-radius:8px;padding:12px 14px;margin:4px 0 14px;font-size:14px;line-height:1.6">${grupo.map(linhaComRotulo).join("<br>")}</div>`);
      continue;
    }
    if (ehTitulo(t)) {
      blocos.push(`<p style="margin:18px 0 6px;font-size:12px;font-weight:700;letter-spacing:.06em;color:${COR.marca}">${escapar(t)}</p>`);
      continue;
    }
    blocos.push(`<p style="margin:0 0 10px;font-size:15px;line-height:1.55">${linhaComRotulo(t)}</p>`);
  }

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(assunto)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;${FONTE};color:${COR.texto}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${COR.borda}">
  <tr><td style="background:${COR.marca};padding:18px 24px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="width:38px;height:38px;background:#ffffff;border-radius:9px;text-align:center;vertical-align:middle;font-size:24px;font-weight:700;color:${COR.marca};line-height:38px">+</td>
      <td style="padding-left:12px;color:#ffffff">
        <div style="font-size:18px;font-weight:700">${escapar(NOME_SISTEMA)}<span style="color:#f2b84b">.</span></div>
        <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.8">${escapar(SUBTITULO_SISTEMA)} · ${escapar(hospital)}</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 24px 8px">
    <h1 style="margin:0 0 16px;font-size:19px;line-height:1.35;color:${COR.texto}">${escapar(assunto)}</h1>
    ${blocos.join("\n    ")}
  </td></tr>
  <tr><td style="padding:14px 24px 20px;border-top:1px solid ${COR.borda};font-size:12px;line-height:1.6;color:${COR.suave}">
    ${rodape.join("<br>") || `Setor de Compras · ${escapar(hospital)}`}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
