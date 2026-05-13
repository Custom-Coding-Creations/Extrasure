type SavePaymentMethodCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function SavePaymentMethodCheckbox({ checked, onChange, disabled = false }: SavePaymentMethodCheckboxProps) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-[#d8ccaf] bg-[#fff8ea] px-3 py-3 text-sm text-[#33453a]">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-[#8ba595] text-[#163526] focus:ring-[#163526]"
      />
      <span>
        Save this payment method for future invoices and faster checkout.
      </span>
    </label>
  );
}
