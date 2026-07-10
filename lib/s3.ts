import 'server-only';

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrlBase: string;
};

function getS3Config(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicUrlBase = process.env.S3_PUBLIC_URL_BASE;

  if (
    !endpoint ||
    !region ||
    !bucket ||
    !accessKeyId ||
    !secretAccessKey ||
    !publicUrlBase
  ) {
    return null;
  }

  return { endpoint, region, bucket, accessKeyId, secretAccessKey, publicUrlBase };
}

export function isS3Configured(): boolean {
  return getS3Config() !== null;
}

function getClient(config: S3Config): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function buildPublicUrl(config: S3Config, key: string): string {
  return `${config.publicUrlBase.replace(/\/$/, '')}/${key}`;
}

/** Extracts the S3 object key back out of a URL previously returned by uploadAvatar. */
function keyFromPublicUrl(config: S3Config, url: string): string | null {
  const base = `${config.publicUrlBase.replace(/\/$/, '')}/`;
  if (!url.startsWith(base)) {
    return null;
  }
  return url.slice(base.length);
}

export type AvatarNamespace = 'marketers' | 'users' | 'companies';

export async function uploadAvatar(
  namespace: AvatarNamespace,
  id: string,
  buffer: Buffer,
  contentType: string,
  extension: string,
): Promise<string> {
  const config = getS3Config();
  if (!config) {
    throw new Error('S3 is not configured');
  }

  const key = `avatars/${namespace}/${id}/${Date.now()}.${extension}`;
  const client = getClient(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    }),
  );

  return buildPublicUrl(config, key);
}

export async function deleteAvatar(url: string): Promise<void> {
  const config = getS3Config();
  if (!config) {
    return;
  }

  const key = keyFromPublicUrl(config, url);
  if (!key) {
    return;
  }

  const client = getClient(config);
  await client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}
