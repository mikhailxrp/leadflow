'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import Card from '@/components/ui/Card';
import FileUploadStep from '@/components/import/FileUploadStep';
import ColumnMappingStep from '@/components/import/ColumnMappingStep';
import ImportPreviewTable from '@/components/import/ImportPreviewTable';
import ImportReport from '@/components/import/ImportReport';
import ImportHistoryTable from '@/components/import/ImportHistoryTable';
import type {
  ImportColumnMapping,
  ImportHistoryItem,
  ImportPreviewDedupResult,
  ImportPreviewParseResult,
  ImportReport as ImportReportType,
  ParsedRow,
} from '@/types/import';

type WizardStep = 'upload' | 'mapping' | 'preview' | 'report';

const STEP_TITLES: Record<WizardStep, string> = {
  upload: 'Шаг 1 из 4 — Загрузка файла',
  mapping: 'Шаг 2 из 4 — Сопоставление колонок',
  preview: 'Шаг 3 из 4 — Превью и дубли',
  report: 'Шаг 4 из 4 — Отчёт',
};

interface ImportWizardProps {
  initialHistory: ImportHistoryItem[];
}

export default function ImportWizard({ initialHistory }: ImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [fileName, setFileName] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ImportColumnMapping>({});
  const [dedupResult, setDedupResult] = useState<ImportPreviewDedupResult | null>(null);
  const [report, setReport] = useState<ImportReportType | null>(null);
  const [historyRefreshSignal, setHistoryRefreshSignal] = useState(0);

  function handleParsed(result: ImportPreviewParseResult, uploadedFileName: string): void {
    setFileName(uploadedFileName);
    setColumns(result.columns);
    setRows(result.rows);
    setMapping(result.suggestedMapping);
    setStep('mapping');
  }

  function handleMapped(result: ImportPreviewDedupResult, finalMapping: ImportColumnMapping): void {
    setMapping(finalMapping);
    setDedupResult(result);
    setStep('preview');
  }

  function handleConfirmed(result: ImportReportType): void {
    setReport(result);
    setStep('report');
    setHistoryRefreshSignal((n) => n + 1);
  }

  function handleReset(): void {
    setStep('upload');
    setFileName('');
    setColumns([]);
    setRows([]);
    setMapping({});
    setDedupResult(null);
    setReport(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card padding="lg">
        <p className="mb-5 text-[12px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
          {STEP_TITLES[step]}
        </p>

        {step === 'upload' && <FileUploadStep onParsed={handleParsed} />}

        {step === 'mapping' && (
          <ColumnMappingStep
            columns={columns}
            rows={rows}
            initialMapping={mapping}
            onBack={() => setStep('upload')}
            onMapped={handleMapped}
          />
        )}

        {step === 'preview' && dedupResult && (
          <ImportPreviewTable
            fileName={fileName}
            rows={rows}
            mapping={mapping}
            result={dedupResult}
            onBack={() => setStep('mapping')}
            onConfirmed={handleConfirmed}
          />
        )}

        {step === 'report' && report && <ImportReport report={report} onReset={handleReset} />}
      </Card>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Icon
            icon="lucide:history"
            className="h-5 w-5 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">
            История импортов
          </h2>
        </div>
        <ImportHistoryTable initialHistory={initialHistory} refreshSignal={historyRefreshSignal} />
      </section>
    </div>
  );
}
