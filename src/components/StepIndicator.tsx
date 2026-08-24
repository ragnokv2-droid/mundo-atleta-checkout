import { Check } from "lucide-react";
import { Step } from "@/types/checkout";
import clsx from "clsx";

const steps = [
  { id: 1, label: "Informações pessoais" },
  { id: 2, label: "Entrega" },
  { id: 3, label: "Pagamento" },
];

export default function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between relative">
        {/* linha de fundo */}
        <div className="absolute top-4 left-8 right-8 h-0.5 bg-gray-200 z-0" />
        <div
          className="absolute top-4 left-8 h-0.5 bg-green-500 z-0 transition-all duration-300"
          style={{ width: `${((current - 1) / 2) * 100}%` }}
        />

        {steps.map((step) => {
          const isCompleted = current > step.id;
          const isActive = current === step.id;

          return (
            <div key={step.id} className="flex flex-col items-center z-10 relative">
              <div
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                  isCompleted && "bg-green-500 border-green-500 text-white",
                  isActive && "bg-blue-900 border-blue-900 text-white",
                  !isCompleted && !isActive && "bg-white border-gray-300 text-gray-400"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span
                className={clsx(
                  "text-[11px] mt-1.5 text-center max-w-[70px] leading-tight",
                  isActive ? "text-blue-900 font-semibold" : "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
