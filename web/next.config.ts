import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O pdfkit lê as fontes padrão do disco; precisa rodar fora do bundle do Next
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
