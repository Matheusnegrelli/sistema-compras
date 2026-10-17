import type { Fornecedor } from "@prisma/client";
import Link from "next/link";
import { salvarFornecedor } from "@/acoes/cadastros";

export function FormFornecedor({ fornecedor }: { fornecedor?: Fornecedor }) {
  return (
    <form action={salvarFornecedor} className="card max-w-2xl space-y-4">
      {fornecedor && <input type="hidden" name="id" value={fornecedor.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="rotulo">Razão social / nome</label>
          <input className="campo" name="nome" required defaultValue={fornecedor?.nome} />
        </div>
        <div>
          <label className="rotulo">CNPJ</label>
          <input className="campo" name="cnpj" required defaultValue={fornecedor?.cnpj} placeholder="00.000.000/0000-00" />
        </div>
        <div>
          <label className="rotulo">Pessoa de contato</label>
          <input className="campo" name="contato" defaultValue={fornecedor?.contato ?? ""} />
        </div>
        <div>
          <label className="rotulo">E-mail</label>
          <input className="campo" name="email" type="email" defaultValue={fornecedor?.email ?? ""} />
        </div>
        <div>
          <label className="rotulo">Telefone</label>
          <input className="campo" name="telefone" defaultValue={fornecedor?.telefone ?? ""} />
        </div>
        <div>
          <label className="rotulo">Nota de histórico (0 a 5)</label>
          <input className="campo" name="notaHistorico" type="number" step="0.1" min={0} max={5} defaultValue={fornecedor?.notaHistorico ?? 3} />
          <p className="mt-1 text-xs text-slate-500">Atualizada automaticamente a cada entrega avaliada.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="rotulo">Dados para pagamento</label>
          <textarea className="campo" name="dadosPagamento" rows={2} defaultValue={fornecedor?.dadosPagamento ?? ""} placeholder="Ex.: PIX (CNPJ) 12.345.678/0001-01 · Banco do Brasil, ag. 1234, cc 56789-0" />
          <p className="mt-1 text-xs text-slate-500">Vão no e-mail que o comprador recebe ao aprovar a compra.</p>
        </div>
        <label className="flex items-center gap-2 self-center text-sm">
          <input type="checkbox" name="ativo" defaultChecked={fornecedor?.ativo ?? true} /> Ativo (participa das cotações)
        </label>
      </div>
      <div className="flex gap-2">
        <button className="btn-primario">Salvar</button>
        <Link href="/fornecedores" className="btn-secundario">Cancelar</Link>
      </div>
    </form>
  );
}
