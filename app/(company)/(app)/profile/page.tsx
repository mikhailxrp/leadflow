import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ProfileLayout from '@/components/profile/ProfileLayout';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toUserProfileDetail, USER_PROFILE_SELECT } from '@/lib/users/profile';

export const metadata: Metadata = {
  title: 'Профиль',
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session || session.kind !== 'company' || !session.user) {
    redirect('/login');
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: USER_PROFILE_SELECT,
  });

  return <ProfileLayout profile={toUserProfileDetail(user)} />;
}
