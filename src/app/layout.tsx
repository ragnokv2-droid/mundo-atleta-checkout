import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Checkout | Mundo Atleta",
  description: "Finalize sua compra com segurança via PIX",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 min-h-screen antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
