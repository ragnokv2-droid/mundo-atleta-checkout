"use client";

import { useState } from "react";
import { AddressData } from "@/types/checkout";
import { fetchAddressByCep } from "@/lib/viaCep";

interface Props {
  data: AddressData;
  onChange: (data: AddressData) => void;
  onNext: () => void;
  onBack: () => void;
}

function maskCep(value: string) {
  const v = value.replace(/\D/g, "").slice(0, 8);
  return v.replace(/(\d{5})(\d)/, "$1-$2");
}

export default function Step2Address({ data, onChange, onNext, onBack }: Props) {
  const [loadingCep, setLoadingCep] = useState(false);

  const isValid =
    data.zipCode.replace(/\D/g, "").length === 8 &&
    data.street.trim().length > 2 &&
    data.number.trim().length > 0 &&
    data.neighborhood.trim().length > 1 &&
    data.city.trim().length > 1 &&
    data.state.length === 2;

  async function handleSearchCep() {
    setLoadingCep(true);
    const result = await fetchAddressByCep(data.zipCode);
    setLoadingCep(false);

    if (result) {
      onChange({
        ...data,
        street: result.logradouro || data.street,
        neighborhood: result.bairro || data.neighborhood,
        city: result.localidade || data.city,
        state: result.uf || data.state,
        complement: result.complemento || data.complement,
      });
    } else {
      alert("CEP não encontrado. Preencha o endereço manualmente.");
    }
  }

  return (
    <div className="px-4 pb-8">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center">
            2
          </span>
          Endereço de Entrega
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CEP <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="00000-000"
              value={data.zipCode}
              onChange={(e) => onChange({ ...data, zipCode: maskCep(e.target.value) })}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
            />
            <button
              type="button"
              onClick={handleSearchCep}
              disabled={loadingCep || data.zipCode.replace(/\D/g, "").length !== 8}
              className="px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg disabled:bg-gray-300"
            >
              {loadingCep ? "..." : "Buscar"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rua <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.street}
            onChange={(e) => onChange({ ...data, street: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.number}
              onChange={(e) => onChange({ ...data, number: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Complemento
            </label>
            <input
              type="text"
              placeholder="Opcional"
              value={data.complement || ""}
              onChange={(e) => onChange({ ...data, complement: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bairro <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.neighborhood}
            onChange={(e) => onChange({ ...data, neighborhood: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cidade <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.city}
              onChange={(e) => onChange({ ...data, city: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado <span className="text-red-500">*</span>
            </label>
            <select
              value={data.state}
              onChange={(e) => onChange({ ...data, state: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 bg-white"
            >
              <option value="">UF</option>
              {[
                "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
                "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
              ].map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 border border-gray-300 text-gray-700 font-medium py-3.5 rounded-xl hover:bg-gray-50"
        >
          Voltar
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="flex-[2] bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          Ir para o pagamento →
        </button>
      </div>
    </div>
  );
}
