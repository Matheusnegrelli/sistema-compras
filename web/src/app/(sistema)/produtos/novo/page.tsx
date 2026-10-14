import { Aviso, Cabecalho } from "@/components/ui";
import { FormProduto } from "@/components/FormProduto";

export default function NovoProduto({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  return (
    <div>
      <Cabecalho titulo="Novo produto" />
      <Aviso searchParams={searchParams} />
      <FormProduto />
    </div>
  );
}
