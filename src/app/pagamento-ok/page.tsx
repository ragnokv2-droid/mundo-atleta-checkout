"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Content() {
  const params = useSearchParams();
  const receipt = params.get("receipt_url");
  const method = params.get("capture_method");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-2xl mx-auto mb-4">
          ✓
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Pagamento confirmado!
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Obrigado pela compra. Em breve você receberá as informações do pedido.
          {method === "credit_card" && " (Cartão de crédito)"}
          {method === "pix" && " (PIX)"}
        </p>

        {receipt && (
          <a
            href={receipt}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-medium text-teal-700 underline mb-4"
          >
            Ver comprovante
          </a>
        )}

        <a
          href="/"
          className="block w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl text-sm"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
}

export default function PagamentoOkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500">
          Carregando...
        </div>
      }
    >
      <Content />
    </Suspense>
  );
}
