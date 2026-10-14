import type { Produto } from "@prisma/client";
import Link from "next/link";
import { salvarProduto } from "@/acoes/cadastros";

export function FormProduto({ produto }: { produto?: Produto }) {
  return (
    <form action={salvarProduto} className="card max-w-2xl space-y-4">
      {produto && <input type="hidden" name="id" value={produto.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="rotulo">SKU (código no estoque)</label>
          <input className="campo font-mono" name="sku" required defaultValue={produto?.sku} placeholder="PAP-001" />
        </div>
        <div className="sm:col-span-2">
          <label className="rotulo">Nome</label>
          <input className="campo" name="nome" required defaultValue={produto?.nome} />
        </div>
        <div>
          <label className="rotulo">Unidade</label>
          <input className="campo" name="unidade" defaultValue={produto?.unidade ?? "UN"} />
        </div>
        <div>
          <label className="rotulo">Estoque mínimo</label>
          <input className="campo" name="estoqueMinimo" type="number" min={0} required defaultValue={produto?.estoqueMinimo ?? 0} />
        </div>
        <div>
          <label className="rotulo">Qtd. padrão de reposição</label>
          <input className="campo" name="quantidadeReposicao" type="number" min={0} defaultValue={produto?.quantidadeReposicao ?? ""} placeholder="automático" />
        </div>
        <div>
          <label className="rotulo">Preço de referência (R$)</label>
          <input className="campo" name="precoReferencia" type="number" step="0.01" min={0} defaultValue={produto?.precoReferencia ?? ""} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={produto?.ativo ?? true} /> Ativo (monitorado)
        </label>
      </div>
      <p className="text-xs text-slate-500">
        O estoque atual não é digitado: ele é lido da API de estoque pelo SKU. Se a quantidade padrão de reposição ficar vazia, o
        sistema sugere repor até o dobro do estoque mínimo.
      </p>
      <div className="flex gap-2">
        <button className="btn-primario">Salvar</button>
        <Link href="/produtos" className="btn-secundario">Cancelar</Link>
      </div>
    </form>
  );
}
