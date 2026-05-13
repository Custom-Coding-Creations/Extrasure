type AchDiscountBadgeProps = {
  savingsAmount: number;
  discountedAmount: number;
};

export function AchDiscountBadge({ savingsAmount, discountedAmount }: AchDiscountBadgeProps) {
  return (
    <div className="rounded-2xl border border-[#cde2d5] bg-[#eef8f2] px-4 py-3 text-sm text-[#214b35]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em]">ACH Savings Available</p>
      <p className="mt-1">
        Save <strong>${savingsAmount.toFixed(2)}</strong> with bank draft. Estimated total: <strong>${discountedAmount.toFixed(2)}</strong>
      </p>
    </div>
  );
}
