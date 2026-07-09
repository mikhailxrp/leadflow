import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import TeamMemberDetail from '@/components/team/TeamMemberDetail';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toUserProfileDetail, USER_PROFILE_SELECT } from '@/lib/users/profile';

export const metadata: Metadata = {
  title: 'Сотрудник',
};

interface TeamMemberPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamMemberPage({ params }: TeamMemberPageProps) {
  const session = await auth();
  if (!session || session.kind !== 'company' || !session.user) {
    redirect('/login');
  }

  if (!hasMinRole(session.user.role, 'HEAD')) {
    redirect('/today');
  }

  const { id } = await params;
  const { companyId } = session.user;

  const member = await prisma.user.findUnique({
    where: { id, companyId },
    select: USER_PROFILE_SELECT,
  });

  if (!member) {
    notFound();
  }

  return <TeamMemberDetail member={toUserProfileDetail(member)} />;
}
