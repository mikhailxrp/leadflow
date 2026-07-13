'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';
import type { ReportExportName } from '@/lib/validations/reports';

interface ExportButtonProps {
  report: ReportExportName;
  from: string;
  to: string;
}

function filenameFromContentDisposition(header: string | null, fallback: string): string {
  const match = header ? /filename="?([^";]+)"?/.exec(header) : null;
  return match?.[1] ?? fallback;
}

export default function ExportButton({ report, from, to }: ExportButtonProps): ReactNode {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(): Promise<void> {
    setIsExporting(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        report,
        from: `${from}T00:00:00.000Z`,
        to: `${to}T23:59:59.999Z`,
      });
      const response = await fetch(`/api/reports/export?${params.toString()}`);

      // Ошибка (400/403/500) отдаёт JSON без Content-Disposition — без этой
      // проверки в файл ушло бы тело ошибки под видом .csv.
      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const filename = filenameFromContentDisposition(
        response.headers.get('Content-Disposition'),
        `${report}-${from}_${to}.csv`,
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('Не удалось экспортировать отчёт');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && (
        <p className="text-[12px] text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="secondary"
        size="md"
        icon={<Icon icon="lucide:download" className="h-4 w-4" />}
        disabled={isExporting}
        onClick={() => void handleExport()}
      >
        {isExporting ? 'Экспорт…' : 'Экспорт CSV'}
      </Button>
    </div>
  );
}
