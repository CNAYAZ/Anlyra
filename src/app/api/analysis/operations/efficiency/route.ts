import { NextResponse } from 'next/server';
import { ok } from '@/lib/api';
import { getEfficiency } from '@/lib/operations-data';

export async function GET() {
  return NextResponse.json(ok(getEfficiency()));
}
