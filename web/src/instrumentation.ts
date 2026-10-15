/** Agenda a rotina automática de verificação de estoque quando o servidor inicia. */
export async function register() {
  // Este formato permite ao Next.js deixar o código Node.js (Prisma, e-mail) fora do runtime edge
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { agendarRotinaEstoque } = await import("./instrumentation-node");
    agendarRotinaEstoque();
  }
}
