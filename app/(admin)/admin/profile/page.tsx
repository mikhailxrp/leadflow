import type { Metadata } from 'next';
import ProfileLayout from '@/components/profile/ProfileLayout';

export const metadata: Metadata = {
  title: 'Профиль пользователя',
};

export default function AdminProfilePage() {
  return <ProfileLayout />;
}
