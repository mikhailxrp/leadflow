import type { Metadata } from 'next';
import LeadComments from '@/components/leads/LeadComments';
import LeadContacts from '@/components/leads/LeadContacts';
import LeadCustomFields from '@/components/leads/LeadCustomFields';
import LeadHeader from '@/components/leads/LeadHeader';
import LeadHistory from '@/components/leads/LeadHistory';
import LeadMarketing from '@/components/leads/LeadMarketing';
import LeadSidebar from '@/components/leads/LeadSidebar';
import LeadYandex from '@/components/leads/LeadYandex';
import { PageContent } from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Иван Петров',
};

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  await params;

  return (
    <PageContent>
      <LeadHeader name="Иван Петров" status="in-progress" />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <LeadContacts
            initials="ИП"
            name="Иван Петров"
            createdAt="12.05.2024, 14:30"
            phone="+7 (999) 123-45-67"
            email="ivan.petrov@example.com"
          />
          <LeadMarketing
            referrer="https://google.com/search?q=crm"
            landingPage="/pricing/spring-offer"
            utm={{
              source: 'google',
              medium: 'cpc',
              campaign: 'spring_sale_2024',
              term: 'купить_crm_москва',
            }}
          />
          <LeadYandex
            campaign="№ 102938475 (Ретаргетинг)"
            adGroup="Брошенная корзина - B2B"
            keyword="«crm система внедрение»"
            device="Десктоп"
            region="Москва и область"
          />
          <LeadCustomFields
            companySize="50-100 сотрудников"
            industry="IT & Software"
            position="Директор по развитию"
            inn="7701234567"
          />
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[440px]">
          <LeadSidebar />
          <LeadComments />
          <LeadHistory />
        </aside>
      </div>
    </PageContent>
  );
}
