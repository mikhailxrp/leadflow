import { requirePlatformSession } from '@/lib/platform/auth';
import { prisma } from '@/lib/prisma';
import { deleteAvatar, isS3Configured, uploadAvatar } from '@/lib/platform/s3';

const MAX_AVATAR_SIZE_BYTES = 3 * 1024 * 1024;

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
  let session;
  try {
    session = await requirePlatformSession({ roles: ['MARKETER'] });
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

  const id = session.admin.id;

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

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return Response.json(
      { error: 'Файл слишком большой (максимум 3 МБ)' },
      { status: 400 },
    );
  }

  try {
    const current = await prisma.platformAdmin.findUniqueOrThrow({
      where: { id },
      select: { avatarUrl: true },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const avatarUrl = await uploadAvatar(id, buffer, file.type, extension);

    await prisma.platformAdmin.update({
      where: { id },
      data: { avatarUrl },
    });

    if (current.avatarUrl) {
      await deleteAvatar(current.avatarUrl).catch((error: unknown) => {
        console.error('Failed to delete previous avatar:', error);
      });
    }

    return Response.json({ avatarUrl });
  } catch (error) {
    console.error('Failed to upload avatar:', error);
    return Response.json(
      { error: 'Не удалось загрузить аватар' },
      { status: 500 },
    );
  }
}

export async function DELETE(): Promise<Response> {
  let session;
  try {
    session = await requirePlatformSession({ roles: ['MARKETER'] });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  const id = session.admin.id;

  try {
    const current = await prisma.platformAdmin.findUniqueOrThrow({
      where: { id },
      select: { avatarUrl: true },
    });

    if (current.avatarUrl) {
      await deleteAvatar(current.avatarUrl);
    }

    await prisma.platformAdmin.update({
      where: { id },
      data: { avatarUrl: null },
    });

    return Response.json({ avatarUrl: null });
  } catch (error) {
    console.error('Failed to delete avatar:', error);
    return Response.json(
      { error: 'Не удалось удалить аватар' },
      { status: 500 },
    );
  }
}
