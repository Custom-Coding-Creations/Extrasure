export type PaymentMethodType = "card" | "ach" | "none";
export type PaymentMethodBrand = "visa" | "amex" | "discover" | "bank_account" | "generic";

export interface PaymentPreference {
  preferredPaymentMethod: PaymentMethodType;
  autopayEnabled: boolean;
  autopayMethodType: PaymentMethodType;
  achDiscountEligible: boolean;
}

export interface SavedPaymentMethodDTO {
  id: string;
  type: Exclude<PaymentMethodType, "none">;
  brand: PaymentMethodBrand;
  last4: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface AchDiscountSummary {
  originalAmount: number;
  discountedAmount: number;
  savingsAmount: number;
  savings_percentage: 3;
}
