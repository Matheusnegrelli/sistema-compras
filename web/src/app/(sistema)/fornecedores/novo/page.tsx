import { Aviso, Cabecalho } from "@/components/ui";
import { FormFornecedor } from "@/components/FormFornecedor";

export default function NovoFornecedor({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  return (
    <div>
      <Cabecalho titulo="Novo fornecedor" />
      <Aviso searchParams={searchParams} />
      <FormFornecedor />
    </div>
  );
}
