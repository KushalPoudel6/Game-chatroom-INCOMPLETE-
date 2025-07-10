export const metadata = {
  title: "My web application",
  description: "Chat and play games online",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
