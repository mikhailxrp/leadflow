import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Лид-Канал',
    template: '%s — Лид-Канал',
  },
  description:
    'Лид-Канал — система для сбора, обработки и сопровождения лидов от первого контакта до сделки.',
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
    <html lang="ru" className="h-full antialiased" suppressHydrationWarning>
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
