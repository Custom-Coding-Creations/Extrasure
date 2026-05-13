type PaymentMethodItem = {
  id: string;
  type: "card" | "ach";
  brand: string;
  last4: string;
  isDefault: boolean;
};

type PaymentMethodListProps = {
  methods: PaymentMethodItem[];
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  busyId?: string | null;
};

function methodLabel(method: PaymentMethodItem) {
  if (method.type === "ach") {
    return `Bank draft •••• ${method.last4}`;
  }

  return `${method.brand.toUpperCase()} •••• ${method.last4}`;
}

export function PaymentMethodList({ methods, onSetDefault, onDelete, busyId }: PaymentMethodListProps) {
  if (!methods.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#d7caae] bg-[#fff9ec] px-4 py-5 text-sm text-[#4b6355]">
        No saved payment methods yet. Complete a payment and choose to save your method.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {methods.map((method) => (
        <article key={method.id} className="rounded-2xl border border-[#d8ccaf] bg-[#fffaf0] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#173126]">{methodLabel(method)}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#5f7469]">
                {method.isDefault ? "Default method" : "Saved method"}
              </p>
            </div>
            {method.isDefault ? (
              <span className="rounded-full bg-[#1f5038] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white">
                Default
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {!method.isDefault ? (
              <button
                type="button"
                onClick={() => onSetDefault(method.id)}
                disabled={busyId === method.id}
                className="rounded-full border border-[#5f7e6e] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#2a4939] transition hover:bg-[#edf5ef] disabled:opacity-60"
              >
                {busyId === method.id ? "Saving" : "Set Default"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onDelete(method.id)}
              disabled={busyId === method.id}
              className="rounded-full border border-[#8a3d22] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#8a3d22] transition hover:bg-[#8a3d22] hover:text-white disabled:opacity-60"
            >
              {busyId === method.id ? "Removing" : "Delete"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
