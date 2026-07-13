import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';
import type { ImportReport as ImportReportType } from '@/types/import';

interface ImportReportProps {
  report: ImportReportType;
  onReset: () => void;
}

export default function ImportReport({ report, onReset }: ImportReportProps) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Icon icon="lucide:check-circle-2" className="h-5 w-5 text-[#10B981]" aria-hidden="true" />
        <p className="text-[15px] font-medium text-[var(--color-text-primary)]">Импорт завершён</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Загружено" value={report.imported} />
        <StatTile label="Пропущено" value={report.skipped} />
        <StatTile label="Дублей" value={report.duplicates} />
        <StatTile label="Ошибок" value={report.errors} />
      </div>

      <p className="mt-3 text-[12px] text-[var(--color-text-tertiary)]">
        Всего строк в файле: {report.totalRows}
      </p>

      <div className="mt-6">
        <Button variant="secondary" type="button" onClick={onReset}>
          Загрузить ещё файл
        </Button>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[8px] border-[0.5px] border-[var(--color-border)] p-3">
      <p className="text-[20px] font-medium text-[var(--color-text-primary)]">{value}</p>
      <p className="text-[12px] text-[var(--color-text-secondary)]">{label}</p>
    </div>
  );
}
