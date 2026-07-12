export default function CompanyLoading() {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center px-6 py-8">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#10B981]"
          role="status"
          aria-label="Загрузка"
        />
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          Загрузка…
        </p>
      </div>
    </div>
  );
}
