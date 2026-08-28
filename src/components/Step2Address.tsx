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
}

function maskCep(value: string) {
  const v = value.replace(/\D/g, "").slice(0, 8);
  return v.replace(/(\d{5})(\d)/, "$1-$2");
}

export default function Step2Address({
  data,
  shipping,
  onChange,
  onShippingChange,
  onNext,
  onBack,
}: Props) {
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepFound, setCepFound] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const lastCep = useRef("");

  const addressComplete =
    cepFound &&
    data.zipCode.replace(/\D/g, "").length === 8 &&
    data.street.trim().length > 2 &&
    data.number.trim().length > 0 &&
    data.neighborhood.trim().length > 1 &&
    data.city.trim().length > 1 &&
    data.state.length === 2;

  const isValid = addressComplete && shipping !== null;

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

  return (
    <div className="px-4 py-6 bg-white">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-sm flex items-center justify-center font-bold">
            2
          </span>
          Entrega
        </h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Informe o CEP para preencher o endereço automaticamente. Depois escolha
          a forma de entrega.
        </p>
      </div>

      <div className="space-y-4">
        {/* CEP */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">
            CEP
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="00000-000"
              value={data.zipCode}
              onChange={(e) =>
                onChange({ ...data, zipCode: maskCep(e.target.value) })
              }
              className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
            {loadingCep && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                Buscando...
              </span>
            )}
          </div>
          {cepError && (
            <p className="mt-1.5 text-xs text-red-600">{cepError}</p>
          )}
        </div>

        {/* Endereço após CEP */}
        {cepFound && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Rua
              </label>
              <input
                type="text"
                value={data.street}
                onChange={(e) =>
                  onChange({ ...data, street: e.target.value })
                }
                className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Número
                </label>
                <input
                  type="text"
                  placeholder="Nº"
                  value={data.number}
                  onChange={(e) =>
                    onChange({ ...data, number: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Complemento
                </label>
                <input
                  type="text"
                  placeholder="Opcional"
                  value={data.complement || ""}
                  onChange={(e) =>
                    onChange({ ...data, complement: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Bairro
              </label>
              <input
                type="text"
                value={data.neighborhood}
                onChange={(e) =>
                  onChange({ ...data, neighborhood: e.target.value })
                }
                className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Cidade
                </label>
                <input
                  type="text"
                  value={data.city}
                  onChange={(e) =>
                    onChange({ ...data, city: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">
                  Estado
                </label>
                <select
                  value={data.state}
                  onChange={(e) =>
                    onChange({ ...data, state: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                >
                  <option value="">UF</option>
                  {[
                    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
                    "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
                    "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
                  ].map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {/* Frete */}
        {addressComplete && (
          <div className="pt-2">
            <p className="text-sm font-semibold text-gray-900 mb-3">
              Escolha a forma de entrega
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
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selected ? "border-teal-600" : "border-gray-300"
                      }`}
                    >
                      {selected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {option.name}{" "}
                        <span className="font-normal text-gray-500">
                          – {option.days}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {option.description}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 flex-shrink-0">
                      {option.price === 0 ? (
                        <span className="text-teal-700">Grátis</span>
                      ) : (
                        formatBRL(option.price)
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
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
          onClick={onNext}
          disabled={!isValid}
          className="flex-[2] bg-teal-700 hover:bg-teal-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg text-sm transition-colors"
        >
          Ir para Pagamento
        </button>
      </div>
    </div>
  );
}
