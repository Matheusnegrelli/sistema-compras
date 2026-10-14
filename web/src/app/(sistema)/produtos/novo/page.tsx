import { Aviso, Cabecalho } from "@/components/ui";
import { FormProduto } from "@/components/FormProduto";
import { listarSetores } from "@/lib/consultas";

export default async function NovoProduto({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  return (
    <div>
      <Cabecalho titulo="Novo produto" />
      <Aviso searchParams={searchParams} />
      <FormProduto setores={await listarSetores()} />
    </div>
  );
}
