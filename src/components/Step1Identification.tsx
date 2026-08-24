"use client";

import { CustomerData } from "@/types/checkout";

interface Props {
  data: CustomerData;
  onChange: (data: CustomerData) => void;
  onNext: () => void;
}

function onlyNumbers(value: string) {
  return value.replace(/\D/g, "");
}

function maskCPF(value: string) {
  const v = onlyNumbers(value).slice(0, 11);
  return v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskPhone(value: string) {
  const v = onlyNumbers(value).slice(0, 11);
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  }
  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

export default function Step1Identification({ data, onChange, onNext }: Props) {
  const isValid =
    data.name.trim().length >= 3 &&
    data.email.includes("@") &&
    onlyNumbers(data.taxId).length >= 11 &&
    onlyNumbers(data.cellphone).length >= 10;

  return (
    <div className="px-4 pb-8">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-900 text-white text-xs flex items-center justify-center">
            1
          </span>
          Identificação
        </h2>
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
          Utilizaremos seu e-mail para identificar seu perfil, histórico de compra,
          notificação de pedidos e carrinho de compras.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Seu nome completo"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-mail <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            placeholder="ex: maria@gmail.com"
            value={data.email}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CPF <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Digite seu CPF ou CNPJ"
            value={data.taxId}
            onChange={(e) => onChange({ ...data, taxId: maskCPF(e.target.value) })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Celular / Whatsapp <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="(00) 00000-0000"
            value={data.cellphone}
            onChange={(e) => onChange({ ...data, cellphone: maskPhone(e.target.value) })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
          />
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!isValid}
        className="mt-6 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        Ir para a entrega →
      </button>
    </div>
  );
}
