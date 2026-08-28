"use client";

import { CustomerData } from "@/types/checkout";

interface Props {
  data: CustomerData;
  onChange: (data: CustomerData) => void;
  onNext: () => void;
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export default function Step1Identification({ data, onChange, onNext }: Props) {
  const valid =
    data.name.trim().length >= 3 &&
    data.email.includes("@") &&
    onlyDigits(data.taxId).length === 11 &&
    onlyDigits(data.cellphone).length >= 10;

  function set<K extends keyof CustomerData>(key: K, value: string) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="px-4 py-6 bg-white">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#1e3a8a] text-white text-sm flex items-center justify-center font-bold">
            1
          </span>
          Identificação
        </h2>

        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Utilizaremos seu e-mail para identificar seu perfil, histórico de
          compra, notificação de pedidos e carrinho de compras.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">
            Nome completo
          </label>

          <input
            type="text"
            value={data.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="ex.: Maria de Almeida Cruz"
            className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">
            E-mail
          </label>

          <input
            type="email"
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="ex.: maria@gmail.com"
            className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">
            CPF
          </label>

          <input
            type="text"
            inputMode="numeric"
            value={data.taxId}
            onChange={(e) => set("taxId", maskCPF(e.target.value))}
            placeholder="000.000.000-00"
            className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">
            Celular / WhatsApp
          </label>

          <div className="flex gap-2">
            <div className="flex items-center px-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500">
              +55
            </div>

            <input
              type="text"
              inputMode="numeric"
              value={data.cellphone}
              onChange={(e) => set("cellphone", maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              className="flex-1 border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={!valid}
        onClick={onNext}
        className="mt-8 w-full bg-[#1e3a8a] hover:bg-[#172e6b] disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold py-3.5 rounded-lg text-sm transition-colors"
      >
        Ir para Entrega
      </button>
    </div>
  );
}
