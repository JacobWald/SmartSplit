import NavBar from '../components/NavBar/NavBar';
import AuthSessionSync from '../components/AuthSessionSync'
import '@/styles/variables.css';
import '@/styles/globals.css';

export const metadata = {
  title: 'SmartSplit',
  description: 'Simple Expense Sharing for Groups',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font)', margin: 0 }}>
        <AuthSessionSync />
        <NavBar />
        <main>
            {children}
        </main>
      </body>
    </html>
  );
}
