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
    <div className="px-4 py-6 bg-white">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-sm flex items-center justify-center font-bold">
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
            placeholder="ex.: Maria de Almeida Cruz"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">
            E-mail
          </label>
          <input
            type="email"
            placeholder="ex.: maria@gmail.com"
            value={data.email}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">
            CPF
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={data.taxId}
            onChange={(e) =>
              onChange({ ...data, taxId: maskCPF(e.target.value) })
            }
            className="w-full border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">
            Celular / WhatsApp
          </label>
          <div className="flex gap-2">
            <div className="flex items-center px-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500 flex-shrink-0">
              +55
            </div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="(00) 00000-0000"
              value={data.cellphone}
              onChange={(e) =>
                onChange({ ...data, cellphone: maskPhone(e.target.value) })
              }
              className="flex-1 border border-gray-200 rounded-lg px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!isValid}
        className="mt-8 w-full bg-teal-700 hover:bg-teal-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg text-sm transition-colors"
      >
        Ir para Entrega
      </button>
    </div>
  );
}
