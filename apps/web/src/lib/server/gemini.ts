/**
 * Gemini integration — modular and feature-flagged. Everything degrades
 * gracefully when GEMINI_API_KEY is absent.
 */

export const aiEnabled = Boolean(process.env.GEMINI_API_KEY) && process.env.FEATURE_AI !== 'false';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

async function generate(prompt: string, jsonOutput = false): Promise<string> {
  if (!aiEnabled) throw new Error('AI features are not enabled');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: jsonOutput ? { responseMimeType: 'application/json' } : {},
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/** Auto-draft an award citation for a delegate. */
export async function draftCitation(input: {
  name: string;
  award: string;
  committee: string;
  country: string;
  eventName: string;
}): Promise<string> {
  const text = await generate(
    `Write a single formal award citation sentence (max 30 words) for a Model UN certificate. ` +
      `Delegate: ${input.name}. Award: ${input.award}. Committee: ${input.committee}. ` +
      `Representing: ${input.country}. Conference: ${input.eventName}. ` +
      `Tone: dignified, diplomatic. Return only the citation text.`,
  );
  return text.trim();
}

/**
 * Batch-draft certificate description lines — ONE model call for the whole
 * roster, so bulk issuing 100+ rows doesn't hit per-request rate limits.
 */
export async function generateDescriptions(
  rows: Array<{ name: string; award?: string; committee?: string; country?: string }>,
  eventName: string,
): Promise<string[]> {
  const text = await generate(
    `For each delegate below, write one dignified certificate description sentence ` +
      `(15-28 words, formal diplomatic tone, no name repetition — the name appears elsewhere ` +
      `on the certificate). Conference: ${eventName || 'a Model UN conference'}. ` +
      `Return ONLY a JSON array of strings, same order and length as the input.\n\n` +
      JSON.stringify(rows),
    true,
  );
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed) || !parsed.every((s) => typeof s === 'string')) throw new Error('Unexpected AI response');
  if (parsed.length !== rows.length) throw new Error('AI returned a mismatched number of descriptions');
  return parsed;
}

/** Clean an imported delegate sheet: fix casing, trim, dedupe by email. */
export async function cleanDelegateRows(
  rows: Array<Record<string, string>>,
): Promise<Array<Record<string, string>>> {
  const text = await generate(
    `Clean this JSON array of Model UN delegate rows: fix name casing (Title Case), ` +
      `trim whitespace, lowercase emails, normalize committee/country names, and remove ` +
      `duplicate rows with the same email (keep the most complete). Preserve all keys. ` +
      `Return ONLY the cleaned JSON array.\n\n${JSON.stringify(rows)}`,
    true,
  );
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('Unexpected AI response');
  return parsed;
}

/** Help assistant for organizers. */
export async function helpAssistant(question: string): Promise<string> {
  return generate(
    `You are the in-app help assistant for MUN CertView (a free Model UN credentialing ` +
      `platform by the Global Diplomacy Forum). Organizers design certificate templates by ` +
      `uploading a background and dragging fields onto it; they bulk-issue by importing an ` +
      `XLSX/CSV sheet and mapping its columns to template fields; badges use fixed templates; ` +
      `every credential has a public verify URL; members claim credentials by signing up with ` +
      `the email the credential was issued to. Answer concisely (max 120 words): ${question}`,
  );
}
