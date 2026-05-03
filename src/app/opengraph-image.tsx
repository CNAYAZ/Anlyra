import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Pro — Analyze your business with AI';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #2563eb 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 800
            }}
          >
            P
          </div>
          <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>Pro</span>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1 }}>
            Analyze your business
            <br />
            with AI.
          </div>
          <div style={{ marginTop: 24, fontSize: 28, color: '#cbd5e1' }}>
            Import data · Get AI insights · Make better decisions
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
