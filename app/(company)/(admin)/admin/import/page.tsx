import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageContent } from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import NotificationBell from '@/components/notifications/NotificationBell';
import ImportWizard from '@/components/import/ImportWizard';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { ImportHistoryItem } from '@/types/import';

export const metadata: Metadata = {
  title: 'Импорт',
};

export default async function AdminImportPage() {
  const session = await auth();
  if (!session || session.kind !== 'company' || !session.user) {
    redirect('/login');
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    redirect('/today');
  }

  const { companyId } = session.user;

  const batches = await prisma.importBatch.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      status: true,
      totalRows: true,
      imported: true,
      skipped: true,
      duplicates: true,
      errors: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
  });

  const initialHistory: ImportHistoryItem[] = batches.map((batch) => ({
    id: batch.id,
    fileName: batch.fileName,
    status: batch.status,
    totalRows: batch.totalRows,
    imported: batch.imported,
    skipped: batch.skipped,
    duplicates: batch.duplicates,
    errors: batch.errors,
    createdAt: batch.createdAt.toISOString(),
    createdByName: batch.createdBy.name,
  }));

  return (
    <>
      <PageHeader title="Импорт" actions={<NotificationBell />} />

      <PageContent>
        <ImportWizard initialHistory={initialHistory} />
      </PageContent>
    </>
  );
}
