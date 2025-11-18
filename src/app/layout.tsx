import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '../styles/dynamic.css';
import { ThemeProvider } from '@/components/theme-provider';
import { SecurityProvider } from '@/components/security-provider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DevSecOps Pipeline - Security Scanning Platform',
  description: 'Comprehensive security scanning and vulnerability analysis for your repositories',
  keywords: ['security', 'vulnerability', 'scanning', 'devsecops', 'snyk', 'github'],
  authors: [{ name: 'DevSecOps Pipeline Team' }],
  robots: 'index, follow',
  manifest: '/manifest.json',
  icons: {
    apple: '/apple-touch-icon.svg',
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'DevSecOps Pipeline - Security Scanning Platform',
    description: 'Comprehensive security scanning and vulnerability analysis for your repositories',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DevSecOps Pipeline - Security Scanning Platform',
    description: 'Comprehensive security scanning and vulnerability analysis for your repositories',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.className} bg-black text-green-400 font-mono`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          forcedTheme="dark"
          disableTransitionOnChange
        >
          <SecurityProvider>
            {children}
            <Toaster 
              position="top-right" 
              richColors 
              closeButton
              duration={5000}
              theme="dark"
              toastOptions={{
                style: {
                  background: '#000',
                  border: '1px solid #15803d',
                  color: '#4ade80',
                  fontFamily: 'monospace'
                }
              }}
            />
          </SecurityProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}