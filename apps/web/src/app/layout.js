export const metadata = { title: "SmartSplit", description: "Simple Expense Sharing for Groups" };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, Arial, sans-serif", margin: 0 }}>
        <header style={{ padding: "12px 20px", borderBottom: "1px solid #eee" }}>
          <strong>SmartSplit</strong>
        </header>
        <main style={{ padding: "20px" }}>{children}</main>
      </body>
    </html>
  );
}
