type AutopayToggleProps = {
  enabled: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

export function AutopayToggle({ enabled, onChange, disabled }: AutopayToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-8 w-14 items-center rounded-full border transition ${
        enabled
          ? "border-[#1f5038] bg-[#1f5038]"
          : "border-[#b9ad91] bg-[#efe4cc]"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <span
        className={`inline-block h-6 w-6 rounded-full bg-white transition ${enabled ? "translate-x-7" : "translate-x-1"}`}
      />
      <span className="sr-only">Toggle autopay</span>
    </button>
  );
}
