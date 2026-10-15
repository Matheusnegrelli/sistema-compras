import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Provisa | Apoio à Decisão em Compras Hospitalares",
  description: "Sistema web de apoio à decisão na gestão de compras hospitalares com integração via API e automação de cotações",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
