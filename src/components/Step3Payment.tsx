"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { CheckoutFormData, PixResponse } from "@/types/checkout";
import { PRODUCT, formatBRL } from "@/lib/product";
import { trackMetaEvent } from "@/components/MetaPixel";
import { createEventId, trackMetaCAPI } from "@/lib/meta";

interface Props {
  formData: CheckoutFormData;
  totalAmount: number;
  onBack: () => void;
  onPixReady?: (ready: boolean) => void;
}

const PIX_TIMEOUT_SECONDS = 5 * 60;
const PIX_BASE_PRICE_CENTS = 10400; // R$ 104,00 no Pix sem frete
const CARD_BASE_PRICE_CENTS = 10990; // R$ 109,90 no cartão sem frete

function formatTimer(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Step3Payment({
  formData,
  totalAmount,
  onBack,
  onPixReady,
}: Props) {
  const [pix, setPix] = useState<PixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PIX_TIMEOUT_SECONDS);
  const [purchaseOnPixGenerate, setPurchaseOnPixGenerate] = useState(false);

  // NOVO: configurações do cartão
  const [cardEnabled, setCardEnabled] = useState(false);
  const [payMethod, setPayMethod] = useState<"pix" | "card">("pix");
  const [cardLoading, setCardLoading] = useState(false);

  // O totalAmount já contém o frete selecionado no checkout.
  // Portanto, extraímos o frete a partir do total Pix e somamos ao preço-base do cartão.
  const shippingAmountCents = Math.max(0, totalAmount - PIX_BASE_PRICE_CENTS);
  const cardTotalAmount = CARD_BASE_PRICE_CENTS + shippingAmountCents;

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json?.config?.purchaseOnPixGenerate === true) {
          setPurchaseOnPixGenerate(true);
        }

        // NOVO: verifica se cartão está habilitado
        if (json?.config?.cardEnabled === true) {
          setCardEnabled(true);
        }
      })
      .catch(() => {});
  }, []);

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

  // Informa ao page.tsx quando o PIX foi gerado.
  // Isso faz o StepIndicator e o ProductSummary desaparecerem.
  useEffect(() => {
    onPixReady?.(!!pix);
  }, [pix, onPixReady]);

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

      // Ao definir o PIX, o useEffect acima avisa o page.tsx
      // para esconder as etapas e o resumo.
      setPix(json.data);

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

      if (purchaseOnPixGenerate) {
        const eventId = createEventId();
        const value = totalAmount / 100;

        trackMetaEvent(
          "Purchase",
          {
            content_name: PRODUCT.name,
            content_ids: "ab-tomic",
            content_type: "product",
            currency: "BRL",
            value,
          },
          eventId
        );

        trackMetaCAPI({
          eventName: "Purchase",
          eventId,
          value,
          currency: "BRL",
          contentName: PRODUCT.name,
          contentIds: ["ab-tomic"],
          email: formData.email,
          phone: formData.cellphone,
          name: formData.name,
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro inesperado";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // NOVO: pagamento com cartão via InfinitePay
  async function payWithCard() {
    setCardLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/infinitepay/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: formData.name,
            email: formData.email,
            cellphone: formData.cellphone,
            taxId: formData.taxId,
          },
          address: {
            zipCode: formData.zipCode,
            street: formData.street,
            number: formData.number,
            complement: formData.complement,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
          },
          shipping: formData.shipping,
          amount: cardTotalAmount,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.url) {
        throw new Error(json.error || "Erro ao gerar link de cartão");
      }

      window.location.href = json.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setCardLoading(false);
    }
  }

  function copyCode() {
    if (!pix) return;

    navigator.clipboard.writeText(pix.brCode);
    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  }

  function handleBack() {
    setPix(null);
    onPixReady?.(false);
    onBack();
  }

  // Tela "Quase lá..." depois que o PIX foi gerado.
  // O page.tsx já esconde StepIndicator e ProductSummary.
  if (pix) {
    const expired = secondsLeft <= 0;

    return (
      <div className="px-4 py-8 bg-white min-h-[60vh]">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Quase lá...
          </h2>

          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            {expired ? (
              <>O tempo para pagar este Pix esgotou.</>
            ) : (
              <>
                Pague seu Pix dentro{" "}
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
          <p className="text-sm text-gray-600 mb-1">
            Valor do Pix:
          </p>

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
                <Check className="w-4 h-4" />
                Código copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar código
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            Após copiar o código, abra seu aplicativo de pagamento onde você
            utiliza o Pix.
            <br />
            Escolha a opção{" "}
            <strong className="text-teal-700">
              Pix Copia e Cola
            </strong>{" "}
            e insira o código copiado.
          </p>

          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-3">
              Ou escaneie o QR Code
            </p>

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
          onClick={handleBack}
          className="mt-6 w-full text-sm text-gray-500 underline"
        >
          Voltar
        </button>
      </div>
    );
  }

  // Tela inicial do pagamento.
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

      {/* NOVO: Seletor de método de pagamento */}
      {cardEnabled && (
        <div className="space-y-2 mb-4">
          <button
            type="button"
            onClick={() => setPayMethod("pix")}
            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left ${
              payMethod === "pix"
                ? "border-teal-600 bg-teal-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                payMethod === "pix"
                  ? "border-teal-600"
                  : "border-gray-300"
              }`}
            >
              {payMethod === "pix" && (
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
              )}
            </span>

            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Pix</p>
              <p className="text-xs text-gray-500">5% de desconto</p>
            </div>

            <span className="text-sm font-semibold">
              {formatBRL(totalAmount)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPayMethod("card")}
            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left ${
              payMethod === "card"
                ? "border-teal-600 bg-teal-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                payMethod === "card"
                  ? "border-teal-600"
                  : "border-gray-300"
              }`}
            >
              {payMethod === "card" && (
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
              )}
            </span>

            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Cartão de crédito
              </p>
              <p className="text-xs text-gray-500">
                Até 12x · InfinitePay
              </p>
            </div>

            <span className="text-sm font-semibold">
              {formatBRL(cardTotalAmount)}
            </span>
          </button>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl p-4">
        {/* Mantido o card original quando o cartão não está habilitado.
            Quando habilitado, o seletor acima passa a mostrar os métodos. */}
        {!cardEnabled && (
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full border-2 border-teal-600 flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
              </span>

              <span className="font-semibold text-gray-900">
                Pix
              </span>
            </div>

            <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
              5% de desconto
            </span>
          </div>
        )}

        {!cardEnabled && (
          <p className="text-sm text-gray-500 leading-relaxed mb-3">
            A confirmação de pagamento é realizada em poucos minutos. Utilize o
            aplicativo do seu banco para pagar.
          </p>
        )}

        {!cardEnabled && (
          <p className="text-sm text-gray-800 mb-4">
            Valor no Pix:{" "}
            <strong className="text-gray-900">
              {formatBRL(totalAmount)}
            </strong>
          </p>
        )}

        {/* NOVO: botão de ação conforme método selecionado */}
        {payMethod === "pix" || !cardEnabled ? (
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
        ) : (
          <button
            type="button"
            onClick={payWithCard}
            disabled={cardLoading}
            className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-gray-300 text-white font-bold py-3.5 rounded-lg text-sm"
          >
            {cardLoading ? "Redirecionando..." : "PAGAR COM CARTÃO"}
          </button>
        )}
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
