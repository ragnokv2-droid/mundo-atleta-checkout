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

      // Evento de compra no Meta (quando gera o PIX)
      trackMetaEvent("Purchase", {
        content_name: PRODUCT.name,
        content_ids: ["ab-tomic"],
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

  // Tela depois de gerar o PIX
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

  // Tela inicial de pagamento
  return (
    <div className="px-4 
