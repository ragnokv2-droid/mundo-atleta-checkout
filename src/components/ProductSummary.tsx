"use client";

import { useState } from "react";
import Image from "next/image";
import { PRODUCT, formatBRL } from "@/lib/product";

interface Props {
  showOriginal?: boolean;
  shippingPrice?: number;
  totalAmount?: number;
}

export default function ProductSummary({
  showOriginal = true,
  shippingPrice = 0,
  totalAmount,
}: Props) {
  const [open, setOpen] = useState(false);
  const total = totalAmount ?? PRODUCT.pixPrice + shippingPrice;

  return (
    <div className="bg-white border-b border-gray-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3"
      >
        <div className="text-left min-w-0">
          <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase">
            Resumo (1)
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Informações da sua compra
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-bold text-gray-900">
            {formatBRL(total)}
          </span>
          <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="pt-3 border-t border-gray-100 flex gap-3 items-center">
            <div className="relative w-16 h-16 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
              <Image
                src={PRODUCT.image}
                alt={PRODUCT.name}
                fill
                className="object-contain p-1"
                sizes="64px"
                priority
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {PRODUCT.name}
              </p>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                {showOriginal && (
                  <span className="text-xs text-gray-400 line-through">
                    {formatBRL(PRODUCT.originalPrice)}
                  </span>
                )}
                <span className="text-sm font-bold text-teal-700">
                  {formatBRL(PRODUCT.pixPrice)}
                </span>
              </div>
              <span className="inline-block mt-1 text-[10px] font-semibold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">
                5% OFF no PIX
              </span>
            </div>
          </div>

          {shippingPrice > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-50 flex justify-between text-xs text-gray-600">
              <span>Frete (SEDEX)</span>
              <span>{formatBRL(shippingPrice)}</span>
            </div>
          )}

          {shippingPrice === 0 && totalAmount !== undefined && (
            <div className="mt-3 pt-2 border-t border-gray-50 flex justify-between text-xs text-gray-600">
              <span>Frete (CORREIOS)</span>
              <span className="text-teal-700 font-medium">Grátis</span>
            </div>
          )}

          <div className="mt-2 flex justify-between text-sm font-bold text-gray-900">
            <span>Total</span>
            <span className="text-teal-700">{formatBRL(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
