import type { Metadata } from 'next';
import { PageContent } from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import PipelineSettings, {
  PipelineSettingsStages,
  SaveOrderButton,
} from '@/components/pipeline/PipelineSettings';

export const metadata: Metadata = {
  title: 'Настройки воронки',
};

export default function AdminPipelinePage() {
  return (
    <PipelineSettings>
      <PageHeader
        title="Настройки воронки"
        actions={<SaveOrderButton />}
      />

      <PageContent>
        <p className="mb-6 text-[13px] text-[var(--color-text-secondary)]">
          Перетащите этапы чтобы изменить порядок. Изменения применятся ко всем лидам.
        </p>

        <PipelineSettingsStages />
      </PageContent>
    </PipelineSettings>
  );
}
