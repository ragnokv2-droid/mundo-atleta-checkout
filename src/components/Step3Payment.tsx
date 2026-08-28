"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { CheckoutFormData, PixResponse } from "@/types/checkout";
import { PRODUCT, formatBRL } from "@/lib/product";
import { trackMetaEvent } from "@/components/MetaPixel";

interface Props {
  formData: CheckoutFormData;
  totalAmount: number;
  onBack: () => void;
}

const PIX_TIMEOUT_SECONDS = 5 * 60; // 5 minutos

function formatTimer(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Step3Payment({ formData, totalAmount, onBack }: Props) {
  const [pix, setPix] = useState<PixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PIX_TIMEOUT_SECONDS);

  useEffect(() => {
    if (!pix) return;

    setSecondsLeft(PIX_TIMEOUT_SECONDS);
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [pix]);

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

  // Tela "Quase lá..." após gerar o PIX
  if (pix) {
    const expired = secondsLeft <= 0;

    return (
      <div className="px-4 py-8 bg-white min-h-[60vh]">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Quase lá...</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            {expired ? (
              <>O tempo para pagar este Pix esgotou.</>
            ) : (
              <>
                Pague seu Pix dentro de{" "}
                <strong className="text-gray-800">
                  {formatTimer(secondsLeft)}
                </strong>{" "}
                para garantir sua compra.
              </>
            )}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 text-amber-800 text-sm font-medium px-4 py-2 rounded-full">
            {expired ? "Tempo esgotado" : "Aguardando pagamento"}
            {!expired && (
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse [animation-delay:300ms]" />
              </span>
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl p-5 text-center">
          <p className="text-sm text-gray-600 mb-1">Valor do Pix:</p>
          <p className="text-xl font-bold text-gray-900 mb-4">
            {formatBRL(totalAmount)}
          </p>

          <button
            type="button"
            onClick={copyCode}
            disabled={expired}
            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-lg text-sm transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" /> Código copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copiar código
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            Após copiar o código, abra seu aplicativo de pagamento onde você
            utiliza o Pix.
            <br />
            Escolha a opção{" "}
            <strong className="text-teal-700">Pix Copia e Cola</strong> e
            insira o código copiado.
          </p>

          {/* QR opcional, colapsado visualmente mais abaixo */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-3">Ou escaneie o QR Code</p>
            <div className="flex justify-center">
              <img
                src={pix.brCodeBase64}
                alt="QR Code PIX"
                className="w-40 h-40 rounded-lg border border-gray-100"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="mt-6 w-full text-sm text-gray-500 underline"
        >
          Voltar
        </button>
      </div>
    );
  }

  // Tela inicial — card Pix (FINALIZAR COMPRA)
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
