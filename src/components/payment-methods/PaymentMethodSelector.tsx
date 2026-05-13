import type { PaymentMethodType } from "@/types/payment-preferences";

type PaymentMethodSelectorProps = {
  value: PaymentMethodType;
  onChange: (value: PaymentMethodType) => void;
  disabled?: boolean;
};

const options: Array<{ value: PaymentMethodType; label: string; detail: string }> = [
  {
    value: "ach",
    label: "ACH (Bank Draft)",
    detail: "Prioritize bank draft and ACH-friendly checkout options.",
  },
  {
    value: "card",
    label: "Card",
    detail: "Prioritize card for future payment experiences.",
  },
  {
    value: "none",
    label: "No Preference",
    detail: "Let checkout decide available method ordering.",
  },
];

export function PaymentMethodSelector({ value, onChange, disabled }: PaymentMethodSelectorProps) {
  return (
    <div className="grid gap-2">
      {options.map((option) => (
        <label key={option.value} className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-3">
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="preferredPaymentMethod"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={disabled}
              className="mt-1 h-4 w-4 text-[#163526]"
            />
            <span>
              <span className="block text-sm font-semibold text-[#173126]">{option.label}</span>
              <span className="mt-1 block text-sm text-[#40584a]">{option.detail}</span>
            </span>
          </div>
        </label>
      ))}
    </div>
  );
}
