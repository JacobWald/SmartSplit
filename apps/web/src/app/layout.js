import NavBar from '../components/NavBar/NavBar';
import BasicOutline from '../components/basicOutline/BasicOutline';

export const metadata = {
  title: 'SmartSplit',
  description: 'Simple Expense Sharing for Groups',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {/* Use your outline as a wrapper around routed content */}
        <BasicOutline>
          {children}
        </BasicOutline>
      </body>
    </html>
  );
}
