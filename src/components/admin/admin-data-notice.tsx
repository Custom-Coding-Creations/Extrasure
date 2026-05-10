type AdminDataNoticeProps = {
  message: string;
};

export function AdminDataNotice({ message }: AdminDataNoticeProps) {
  return (
    <section className="rounded-2xl border border-[#d5bcb6] bg-[#fff1ec] p-5 text-sm text-[#7b2f1b]">
      <h2 className="text-xl text-[#5b2415]">Dashboard Data Unavailable</h2>
      <p className="mt-2">{message}</p>
      <p className="mt-3 text-xs text-[#8d4b37]">
        Restore database connectivity or load the required operational records before using admin controls.
      </p>
    </section>
  );
}