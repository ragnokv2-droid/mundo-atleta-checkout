"use client";

import { useState, useEffect, useRef } from "react";
import {
  AddressData,
  ShippingMethod,
  SHIPPING_OPTIONS,
} from "@/types/checkout";
import { fetchAddressByCep } from "@/lib/viaCep";
import { formatBRL } from "@/lib/product";

interface Props {
  data: AddressData;
  shipping: ShippingMethod | null;
  onChange: (data: AddressData) => void;
  onShippingChange: (method: ShippingMethod) => void;
  onNext: () => void;
  onBack: () => void;
  customerName?: string;
}

function maskCep(value: string) {
  const v = value.replace(/\D/g, "").slice(0, 8);
  return v.replace(/(\d{5})(\d)/, "$1-$2");
}

function CheckIcon() {
  return (
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1e3a8a] text-sm font-bold">
      ✓
    </span>
  );
}

export default function Step2Address({
  data,
  shipping,
  onChange,
  onShippingChange,
  onNext,
  onBack,
  customerName = "",
}: Props) {
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepFound, setCepFound] = useState(
    data.zipCode.replace(/\D/g, "").length === 8 && data.street.length > 2
  );
  const [cepError, setCepError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState(customerName);
  const [phase, setPhase] = useState<"address" | "shipping">("address");
  const lastCep = useRef("");

  useEffect(() => {
    if (customerName && !recipient) {
      setRecipient(customerName);
    }
  }, [customerName, recipient]);

  const addressComplete =
    cepFound &&
    data.zipCode.replace(/\D/g, "").length === 8 &&
    data.street.trim().length > 2 &&
    data.number.trim().length > 0 &&
    data.neighborhood.trim().length > 1 &&
    data.city.trim().length > 1 &&
    data.state.length === 2 &&
    recipient.trim().length > 1;

  const canGoPayment = addressComplete && shipping !== null;

  useEffect(() => {
    const clean = data.zipCode.replace(/\D/g, "");

    if (clean.length !== 8) {
      setCepFound(false);
      setCepError(null);
      return;
    }

    if (clean === lastCep.current) return;
    lastCep.current = clean;

    async function search() {
      setLoadingCep(true);
      setCepError(null);

      const result = await fetchAddressByCep(clean);

      setLoadingCep(false);

      if (result) {
        onChange({
          ...data,
          zipCode: maskCep(clean),
          street: result.logradouro || "",
          neighborhood: result.bairro || "",
          city: result.localidade || "",
          state: result.uf || "",
          complement: result.complemento || data.complement || "",
        });

        setCepFound(true);
      } else {
        setCepFound(false);
        setCepError("CEP não encontrado. Verifique e tente novamente.");
      }
    }

    search();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.zipCode]);

  if (phase === "shipping") {
    return (
      <div className="px-4 py-6 bg-white">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#1e3a8a] text-white text-sm flex items-center justify-center font-bold">
              2
            </span>
            Entrega
          </h2>

          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Cadastre ou selecione um endereço
          </p>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-[#1e3a8a] mb-2">
            + Novo endereço
          </p>

          <div className="border border-gray-200 rounded-xl p-4 flex gap-3 items-start">
            <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-[#1e3a8a] flex items-center justify-center flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 leading-snug">
                {data.street}, {data.number}
                {data.complement ? ` - ${data.complement}` : ""} -{" "}
                {data.neighborhood}
              </p>

              <p className="text-xs text-gray-500 mt-1">
                {data.city}-{data.state} | CEP {data.zipCode}
              </p>

              {recipient && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Destinatário: {recipient}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setPhase("address")}
              className="text-xs text-gray-500 hover:text-[#1e3a8a] font-medium flex-shrink-0"
            >
              Editar
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900 mb-3">
            Escolha uma forma de entrega:
          </p>

          <div className="space-y-2">
            {SHIPPING_OPTIONS.map((option) => {
              const selected = shipping === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onShippingChange(option.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-colors ${
                    selected
                      ? "border-[#1e3a8a] bg-[#1e3a8a]/5"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selected
                        ? "border-[#1e3a8a]"
                        : "border-gray-300"
                    }`}
                  >
                    {selected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {option.name}
                    </p>

                    <p className="text-xs text-gray-500 mt-0.5">
                      {option.days}
                      {option.description ? ` · ${option.description}` : ""}
                    </p>
                  </div>

                  <div className="text-sm font-semibold text-gray-900 flex-shrink-0">
                    {option.price === 0 ? (
                      <span className="text-[#1e3a8a]">Grátis</span>
                    ) : (
                      formatBRL(option.price)
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => setPhase("address")}
            className="flex-1 border border-gray-300 text-gray-700 font-medium py-3.5 rounded-lg hover:bg-gray-50 text-sm"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!canGoPayment}
            className="flex-[2] bg-[#1e3a8a] hover:bg-[#172e6b] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg text-sm transition-colors"
          >
            Ir para Pagamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 bg-white">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#1e3a8a] text-white text-sm flex items-center justify-center font-bold">
            2
          </span>
          Entrega
        </h2>

        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Cadastre ou selecione um endereço
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-end justify-between gap-3 mb-1.5">
            <label className="block text-sm font-medium text-gray-800">
              CEP
            </label>

            {cepFound && data.city && data.state && (
              <span className="text-sm text-gray-500">
                {data.city} / {data.state}
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="postal-code"
              placeholder="00000-000"
              value={data.zipCode}
              onChange={(e) =>
                onChange({ ...data, zipCode: maskCep(e.target.value) })
              }
              className="w-full border border-gray-200 rounded-lg px-3.5 py-3 pr-10 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
            />

            {loadingCep && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                Buscando...
              </span>
            )}

            {!loadingCep && cepFound && <CheckIcon />}
          </div>

          {cepError && (
            <p className="mt-1.5 text-xs text-red-600">{cepError}</p>
          )}
        </div>

        {cepFound && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Endereço
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={data.street}
                  onChange={(e) =>
                    onChange({ ...data, street: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-3 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
                />

                {data.street.trim().length > 2 && <CheckIcon />}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Número
                </label>

                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Nº"
                    value={data.number}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        number: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-3 pr-10 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
                    autoFocus
                  />

                  {data.number.trim().length > 0 && <CheckIcon />}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Bairro
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={data.neighborhood}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        neighborhood: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-3 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
                  />

                  {data.neighborhood.trim().length > 1 && <CheckIcon />}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Complemento{" "}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>

              <input
                type="text"
                value={data.complement || ""}
                onChange={(e) =>
                  onChange({ ...data, complement: e.target.value })
                }
                className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Destinatário
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Nome de quem vai receber"
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-3 pr-10 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
                />

                {recipient.trim().length > 1 && <CheckIcon />}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border border-gray-300 text-gray-700 font-medium py-3.5 rounded-lg hover:bg-gray-50 text-sm"
        >
          Voltar
        </button>

        <button
          type="button"
          onClick={() => setPhase("shipping")}
          disabled={!addressComplete}
          className="flex-[2] bg-[#1e3a8a] hover:bg-[#172e6b] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg text-sm transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
