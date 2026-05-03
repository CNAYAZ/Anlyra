import Link from 'next/link';

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>404 — Not found</h1>
        <Link href="/it">Home</Link>
      </body>
    </html>
  );
}
