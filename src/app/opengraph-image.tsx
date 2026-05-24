import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Anlyra — Analytics AI per PMI italiane';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(150deg, #F9F4EB 0%, #EFE8D8 60%, #E4D9C4 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Top decorative bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: '#5B6F4E',
          }}
        />

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: '#5B6F4E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F9F4EB',
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            A
          </div>
          <span
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: '#2A2520',
              letterSpacing: -0.5,
            }}
          >
            Anlyra
          </span>
        </div>

        {/* Main headline */}
        <div style={{ marginTop: 'auto' }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              color: '#2A2520',
            }}
          >
            Analytics AI
            <br />
            per PMI italiane.
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 26,
              color: '#6B6760',
              fontWeight: 400,
              letterSpacing: -0.2,
            }}
          >
            Insights · KPI · Forecasting · Alert automatici
          </div>

          {/* Tag */}
          <div
            style={{
              marginTop: 36,
              display: 'inline-flex',
              alignItems: 'center',
              background: '#5B6F4E',
              color: '#F9F4EB',
              borderRadius: 100,
              padding: '10px 22px',
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: 0.2,
            }}
          >
            Privacy seria, sul serio.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
