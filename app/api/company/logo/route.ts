import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { prisma } from '@/lib/prisma';
import { deleteAvatar, isS3Configured, uploadAvatar } from '@/lib/s3';

const MAX_LOGO_SIZE_BYTES = 3 * 1024 * 1024;

const ALLOWED_MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'HEAD' });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  if (!isS3Configured()) {
    return Response.json(
      { error: 'Хранилище S3 не настроено' },
      { status: 503 },
    );
  }

  const id = actor.companyId;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'Файл не найден' }, { status: 400 });
  }

  const extension = ALLOWED_MIME_TO_EXTENSION[file.type];
  if (!extension) {
    return Response.json(
      { error: 'Допустимые форматы: JPEG, PNG, WEBP' },
      { status: 400 },
    );
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return Response.json(
      { error: 'Файл слишком большой (максимум 3 МБ)' },
      { status: 400 },
    );
  }

  try {
    const current = await prisma.company.findUniqueOrThrow({
      where: { id },
      select: { logoUrl: true },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const logoUrl = await uploadAvatar('companies', id, buffer, file.type, extension);

    await prisma.company.update({
      where: { id },
      data: { logoUrl },
    });

    if (current.logoUrl) {
      await deleteAvatar(current.logoUrl).catch((error: unknown) => {
        console.error('Failed to delete previous company logo:', error);
      });
    }

    return Response.json({ logoUrl });
  } catch (error) {
    console.error('Failed to upload company logo:', error);
    return Response.json(
      { error: 'Не удалось загрузить логотип' },
      { status: 500 },
    );
  }
}

export async function DELETE(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'HEAD' });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  const id = actor.companyId;

  try {
    const current = await prisma.company.findUniqueOrThrow({
      where: { id },
      select: { logoUrl: true },
    });

    if (current.logoUrl) {
      await deleteAvatar(current.logoUrl);
    }

    await prisma.company.update({
      where: { id },
      data: { logoUrl: null },
    });

    return Response.json({ logoUrl: null });
  } catch (error) {
    console.error('Failed to delete company logo:', error);
    return Response.json(
      { error: 'Не удалось удалить логотип' },
      { status: 500 },
    );
  }
}
