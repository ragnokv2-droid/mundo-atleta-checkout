import { Step } from "@/types/checkout";
import clsx from "clsx";

const steps = [
  { id: 1, label: "Informações pessoais" },
  { id: 2, label: "Entrega" },
  { id: 3, label: "Pagamento" },
];

export default function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="px-4 py-5 bg-white border-b border-gray-100">
      <div className="flex items-start justify-between relative max-w-md mx-auto">
        {/* linha de fundo */}
        <div className="absolute top-4 left-[16%] right-[16%] h-[2px] bg-gray-200 z-0" />

        {/* linha ativa */}
        <div
          className="absolute top-4 left-[16%] h-[2px] bg-teal-600 z-0 transition-all duration-300"
          style={{
            width:
              current === 1 ? "0%" : current === 2 ? "34%" : "68%",
          }}
        />

        {steps.map((step) => {
          const isCompleted = current > step.id;
          const isActive = current === step.id;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center z-10 relative w-1/3"
            >
              <div
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                  (isCompleted || isActive) &&
                    "bg-teal-600 border-teal-600 text-white",
                  !isCompleted &&
                    !isActive &&
                    "bg-white border-gray-300 text-gray-400"
                )}
              >
                {step.id}
              </div>
              <span
                className={clsx(
                  "text-[11px] mt-2 text-center leading-tight px-1",
                  isActive
                    ? "text-teal-700 font-semibold"
                    : "text-gray-400"
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
