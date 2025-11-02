import NavBar from '../components/NavBar/NavBar';
import BasicOutline from '../components/basicOutline/BasicOutline';
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
        <NavBar />
        {/* Use your outline as a wrapper around routed content */}
        <main>
          <BasicOutline>
            {children}
          </BasicOutline>
        </main>
      </body>
    </html>
  );
}
