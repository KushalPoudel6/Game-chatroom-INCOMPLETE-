import './styles.css';

export const metadata = {
  title: "Nostalic Games",
  description: "Chat and play games online",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
