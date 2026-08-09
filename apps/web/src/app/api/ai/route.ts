import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/server/auth';
import { aiEnabled, cleanDelegateRows, draftCitation, generateDescriptions, helpAssistant } from '@/lib/server/gemini';
import { clientKey, rateLimit } from '@/lib/server/ratelimit';

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('citation'),
    name: z.string().max(200),
    award: z.string().max(200),
    committee: z.string().max(200).default(''),
    country: z.string().max(200).default(''),
    event_name: z.string().max(200).default(''),
  }),
  z.object({ action: z.literal('clean_sheet'), rows: z.array(z.record(z.string())).max(500) }),
  z.object({
    action: z.literal('descriptions'),
    rows: z
      .array(
        z.object({
          name: z.string().max(200),
          award: z.string().max(200).optional(),
          committee: z.string().max(200).optional(),
          country: z.string().max(200).optional(),
        }),
      )
      .min(1)
      .max(500),
    event_name: z.string().max(200).default(''),
  }),
  z.object({ action: z.literal('help'), question: z.string().min(3).max(500) }),
]);

/** Feature-flagged Gemini endpoints. Returns 503 (never breaks) without a key. */
export async function POST(request: Request) {
  if (!aiEnabled) return NextResponse.json({ error: 'AI features are not enabled' }, { status: 503 });
  if (!(await getSession())) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (!rateLimit(clientKey(request, 'ai'), 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  try {
    const input = parsed.data;
    if (input.action === 'citation') {
      const citation = await draftCitation({
        name: input.name,
        award: input.award,
        committee: input.committee,
        country: input.country,
        eventName: input.event_name,
      });
      return NextResponse.json({ citation });
    }
    if (input.action === 'clean_sheet') {
      return NextResponse.json({ rows: await cleanDelegateRows(input.rows) });
    }
    if (input.action === 'descriptions') {
      return NextResponse.json({ descriptions: await generateDescriptions(input.rows, input.event_name) });
    }
    return NextResponse.json({ answer: await helpAssistant(input.question) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
