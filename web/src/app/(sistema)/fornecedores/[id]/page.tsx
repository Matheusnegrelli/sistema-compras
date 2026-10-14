import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Aviso, Cabecalho } from "@/components/ui";
import { FormFornecedor } from "@/components/FormFornecedor";

export default async function EditarFornecedor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { id } = await params;
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id: Number(id) } });
  if (!fornecedor) notFound();
  return (
    <div>
      <Cabecalho titulo={`Editar ${fornecedor.nome}`} />
      <Aviso searchParams={searchParams} />
      <FormFornecedor fornecedor={fornecedor} />
    </div>
  );
}
