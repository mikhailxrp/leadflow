import 'server-only';

import { deleteAvatar } from '@/lib/s3';

/**
 * Best-effort удаление файлов удалённой компании в S3 (логотип + аватары пользователей).
 * Ошибки не пробрасываются — удаление данных уже зафиксировано, осиротевший файл не критичен.
 *
 * Живёт отдельно от `deleteCompany.ts`, потому что зависит от `lib/s3` (а тот — от
 * `server-only`, не резолвится в CLI/tsx). `deleteCompany.ts` намеренно свободен от этой
 * зависимости, чтобы `scripts/deleteCompany.ts` мог переиспользовать `deleteCompanyData`.
 */
export async function cleanupCompanyAssets(assetUrls: string[]): Promise<void> {
  for (const url of assetUrls) {
    try {
      await deleteAvatar(url);
    } catch (error) {
      console.error(
        'Failed to delete S3 object during company cleanup:',
        url,
        error,
      );
    }
  }
}
