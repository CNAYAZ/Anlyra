import { NextResponse } from 'next/server';
import { onboardingPayloadSchema } from '@/lib/onboarding';
import { apiErr, apiOk, parseOrFail } from '@/lib/api';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(apiErr('Invalid JSON body'), { status: 400 });
  }

  const parsed = parseOrFail(onboardingPayloadSchema, body);
  if (!parsed.ok) return NextResponse.json(apiErr(parsed.error), { status: 422 });

  return NextResponse.json(
    apiOk({
      organizationId: 'org_' + Math.random().toString(36).slice(2, 10),
      template: parsed.data.template,
      importMode: parsed.data.importMode
    })
  );
}
