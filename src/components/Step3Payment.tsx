"use client";

import { useState } from "react";
import { Copy, Check, Loader2, Lock } from "lucide-react";
import { CheckoutFormData, PixResponse } from "@/types/checkout";
import { PRODUCT, formatBRL } from "@/lib/product";
import { trackMetaEvent } from "@/components/MetaPixel";

interface Props {
  formData: CheckoutFormData;
  totalAmount: number;
  onBack: () => void;
}

export default function Step3Payment({ formData, totalAmount, onBack }: Props) {
  const [pix, setPix] = useState<PixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generatePix() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount,
          customer: {
            name: formData.name,
            email: formData.email,
            taxId: formData.taxId.replace(/\D/g, ""),
            cellphone: formData.cellphone.replace(/\D/g, ""),
          },
          metadata: {
            product: PRODUCT.name,
            address: `${formData.street}, ${formData.number} - ${formData.neighborhood}, ${formData.city}/${formData.state} - CEP ${formData.zipCode}`,
          },
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao gerar PIX");
      }

      setPix(json.data);

     trackMetaEvent("Purchase", {
  content_name: PRODUCT.name,
  content_ids: "ab-tomic",
  content_type: "product",
  currency: "BRL",
  value: totalAmount / 100,
});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    if (!pix) return;
    navigator.clipboard.writeText(pix.brCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (pix) {
    return (
      <div className="px-4 pb-10">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center">
              3
            </span>
            Pagamento via PIX
          </h2>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
            <h3 className="font-semibold text-gray-900 mb-4">Pague com PIX</h3>

            <div className="flex justify-center mb-4">
              <img
                src={pix.brCodeBase64}
                alt="QR Code PIX"
                className="w-52 h-52 rounded-lg border border-gray-100"
              />
            </div>

            <p className="text-xs text-gray-500 mb-2">Código PIX copia e cola</p>
            <div className="bg-gray-50 rounded-lg p-3 text-left text-[11px] text-gray-600 break-all font-mono mb-3 max-h-20 overflow-y-auto">
              {pix.brCode}
            </div>

            <button
              onClick={copyCode}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar
                </>
              )}
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600">Total a pagar</p>
            <p className="text-2xl font-bold text-green-600">
              {formatBRL(totalAmount)}
            </p>
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-green-600 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Aguardando pagamento...
            </p>
            <p className="text-xs text-gray-400">
              O QR Code expira em aproximadamente 30 minutos
            </p>
          </div>

          <button
            onClick={onBack}
            className="w-full border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 text-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-10">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center">
            3
          </span>
          Pagamento
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Para finalizar seu pedido escolha uma forma de pagamento
        </p>
      </div>

      <div className="bg-white rounded-xl border-2 border-blue-900 shadow-sm overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-blue-900 flex items-center justify-center flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-900" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">Pix (5% OFF)</span>
                <span className="text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded">
                  5% DE DESCONTO
                </span>
              </div>

              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Ao confirmar, um código Pix será gerado para você realizar o
                pagamento pelo aplicativo do seu banco.
              </p>

              <p className="text-sm mt-3">
                <span className="text-gray-600">Valor no pix: </span>
                <span className="font-bold text-gray-900">
                  {formatBRL(totalAmount)}
                </span>{" "}
                <span className="text-gray-400 line-through text-xs">
                  {formatBRL(PRODUCT.originalPrice)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={generatePix}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando PIX...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Pagar
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg p-3 text-center">
          {error}
        </p>
      )}

      <button
        onClick={onBack}
        className="mt-4 w-full text-sm text-gray-500 underline"
      >
        Voltar
      </button>
    </div>
  );
}
