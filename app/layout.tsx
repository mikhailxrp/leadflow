import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'cyrillic'],
});

export const metadata: Metadata = {
  title: {
    default: 'LeadFlow',
    template: '%s — LeadFlow',
  },
  description:
    'LeadFlow — система для сбора, обработки и сопровождения лидов от первого контакта до сделки.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Анти-FOUC: применяем data-theme до гидрации React.
            Для платформенного раздела (/platform) — ключ theme_platform,
            для всех остальных — theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k=location.pathname.startsWith('/platform')?'theme_platform':'theme';var t=localStorage.getItem(k);if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.dataset.theme='dark';}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
