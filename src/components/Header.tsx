import Image from "next/image";
import { Lock } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="Mundo Atleta"
          width={140}
          height={42}
          className="h-9 w-auto object-contain"
          priority
        />
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Lock className="w-3.5 h-3.5" />
        <span>Pagamento 100% seguro</span>
      </div>
    </header>
  );
}
