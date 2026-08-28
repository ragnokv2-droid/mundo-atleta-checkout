"use client";

import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
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

      fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.name,
          email: formData.email,
          telefone: formData.cellphone,
          endereco: `${formData.street}, ${formData.number} - ${formData.neighborhood}, ${formData.city}/${formData.state} - CEP ${formData.zipCode}`,
          frete: formData.shipping || "",
          valor: (totalAmount / 100).toFixed(2),
          status: "aguardando_pix",
          etapa: 3,
        }),
      }).catch(() => {});
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

  // Tela após gerar o PIX (QR + copia e cola)
  if (pix) {
    return (
      <div className="px-4 py-6 bg-white">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-sm flex items-center justify-center font-bold">
              3
            </span>
            Pagamento via PIX
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Escaneie o QR Code ou copie o código no app do seu banco.
          </p>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
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
              type="button"
              onClick={copyCode}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar código
                </>
              )}
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600">Total a pagar</p>
            <p className="text-2xl font-bold text-teal-700">
              {formatBRL(totalAmount)}
            </p>
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-teal-700 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Aguardando pagamento...
            </p>
            <p className="text-xs text-gray-400">
              O QR Code expira em aproximadamente 30 minutos
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="w-full border border-gray-300 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 text-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Tela inicial — card estilo Torqua
  return (
    <div className="px-4 py-6 bg-white">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-sm flex items-center justify-center font-bold">
            3
          </span>
          Pagamento
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Para finalizar seu pedido, escolha a forma de pagamento
        </p>
      </div>

      <div className="border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full border-2 border-teal-600 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
            </span>
            <span className="font-semibold text-gray-900">Pix</span>
          </div>
          <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
            5% de desconto
          </span>
        </div>

        <p className="text-sm text-gray-500 leading-relaxed mb-3">
          A confirmação de pagamento é realizada em poucos minutos. Utilize o
          aplicativo do seu banco para pagar.
        </p>

        <p className="text-sm text-gray-800 mb-4">
          Valor no Pix:{" "}
          <strong className="text-gray-900">{formatBRL(totalAmount)}</strong>
        </p>

        <button
          type="button"
          onClick={generatePix}
          disabled={loading}
          className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold py-3.5 rounded-lg text-sm tracking-wide transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Gerando PIX...
            </>
          ) : (
            "FINALIZAR COMPRA"
          )}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg p-3 text-center">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-4 w-full text-sm text-gray-500 underline"
      >
        Voltar
      </button>
    </div>
  );
}
