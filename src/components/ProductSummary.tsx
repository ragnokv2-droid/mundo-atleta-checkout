import Image from "next/image";
import { PRODUCT, formatBRL } from "@/lib/product";

export default function ProductSummary({ showOriginal = true }: { showOriginal?: boolean }) {
  return (
    <div className="mx-4 mb-4 bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex gap-3 items-center">
      <div className="relative w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
        <Image
          src={PRODUCT.image}
          alt={PRODUCT.name}
          fill
          className="object-contain p-1"
          sizes="80px"
          priority
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-tight">{PRODUCT.name}</p>
        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
          {showOriginal && (
            <span className="text-xs text-gray-400 line-through">
              {formatBRL(PRODUCT.originalPrice)}
            </span>
          )}
          <span className="text-base font-bold text-green-600">
            {formatBRL(PRODUCT.pixPrice)}
          </span>
        </div>
        <span className="inline-block mt-1 text-[10px] font-semibold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">
          5% OFF no PIX
        </span>
      </div>
    </div>
  );
}
