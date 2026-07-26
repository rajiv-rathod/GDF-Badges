'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { CertificateField } from '@gdf/shared';
import { buttonClass, Card, ErrorBox, inputClass, PageTitle } from '@/components/ui';

interface TemplateDraft {
  id: string | null;
  name: string;
  background_url: string;
  layout_json: CertificateField[];
  page_size: string;
}

const PAGE_RATIOS: Record<string, number> = {
  'A4-landscape': 297 / 210,
  'A4-portrait': 210 / 297,
  'letter-landscape': 11 / 8.5,
  'letter-portrait': 8.5 / 11,
};

/**
 * Canva-style field-mapping designer: the canvas mirrors the PDF renderer's
 * coordinate system (x/y/width as % of the page, y from the top), so what you
 * drag here is exactly what pdf-lib draws.
 */
export function Designer({ orgId, orgSlug, template }: { orgId: string; orgSlug: string; template: TemplateDraft }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(template);
  const [selectedKey, setSelectedKey] = useState<string | null>(draft.layout_json[0]?.key ?? null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const dragState = useRef<{ key: string; offsetX: number; offsetY: number } | null>(null);

  const selected = draft.layout_json.find((f) => f.key === selectedKey) ?? null;
  const ratio = PAGE_RATIOS[draft.page_size] ?? PAGE_RATIOS['A4-landscape'];

  function updateField(key: string, patch: Partial<CertificateField>) {
    setDraft((d) => ({
      ...d,
      layout_json: d.layout_json.map((f) => (f.key === key ? { ...f, ...patch } : f)),
    }));
  }

  function onPointerDown(e: React.PointerEvent, field: CertificateField) {
    const canvas = canvasRef.current!.getBoundingClientRect();
    dragState.current = {
      key: field.key,
      offsetX: e.clientX - (canvas.left + (field.x / 100) * canvas.width),
      offsetY: e.clientY - (canvas.top + (field.y / 100) * canvas.height),
    };
    setSelectedKey(field.key);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current || !canvasRef.current) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    const x = Math.min(98, Math.max(0, ((e.clientX - dragState.current.offsetX - canvas.left) / canvas.width) * 100));
    const y = Math.min(96, Math.max(0, ((e.clientY - dragState.current.offsetY - canvas.top) / canvas.height) * 100));
    updateField(dragState.current.key, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }

  function addField() {
    let i = 1;
    while (draft.layout_json.some((f) => f.key === `field_${i}`)) i += 1;
    const field: CertificateField = {
      key: `field_${i}`, label: `Field ${i}`, x: 10, y: 10, width: 40,
      font: 'Helvetica', size: 16, weight: 400, align: 'left', color: '#06002e', sample: 'Sample text',
    };
    setDraft((d) => ({ ...d, layout_json: [...d.layout_json, field] }));
    setSelectedKey(field.key);
  }

  function removeField(key: string) {
    setDraft((d) => ({ ...d, layout_json: d.layout_json.filter((f) => f.key !== key) }));
    if (selectedKey === key) setSelectedKey(null);
  }

  async function uploadBackground(file: File) {
    setBusy('upload');
    setError('');
    try {
      const form = new FormData();
      form.set('org_id', orgId);
      form.set('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setDraft((d) => ({ ...d, background_url: data.url }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function save(): Promise<string | null> {
    setBusy('save');
    setError('');
    try {
      const res = await fetch('/api/certificates/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, id: draft.id ?? undefined, org_id: orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setDraft((d) => ({ ...d, id: data.id }));
      return data.id;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setBusy('');
    }
  }

  async function preview() {
    setBusy('preview');
    setError('');
    // Open the tab synchronously so popup blockers allow it, fill it after.
    const tab = window.open('about:blank', '_blank');
    try {
      const res = await fetch('/api/certificates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          background_url: draft.background_url,
          layout_json: draft.layout_json,
          page_size: draft.page_size,
          values: {},
        }),
      });
      if (!res.ok) throw new Error('Preview failed');
      const url = URL.createObjectURL(await res.blob());
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (err) {
      tab?.close();
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function saveAndBulk() {
    const id = await save();
    if (id) router.push(`/org/${orgSlug}/certificates/${id}/bulk`);
  }

  return (
    <>
      <PageTitle title="Certificate designer" subtitle="Drag fields onto your background. The live canvas matches the generated PDF 1:1." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className={`${inputClass} max-w-xs`} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
        <select
          className={`${inputClass} max-w-44`}
          value={draft.page_size}
          onChange={(e) => setDraft((d) => ({ ...d, page_size: e.target.value }))}
        >
          {Object.keys(PAGE_RATIOS).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) uploadBackground(e.target.files[0]);
            e.target.value = '';
          }}
        />
        <button className={buttonClass.outline} onClick={() => fileInput.current?.click()} disabled={busy !== ''}>
          {busy === 'upload' ? 'Uploading…' : 'Upload background'}
        </button>
        <button className={buttonClass.outline} onClick={preview} disabled={busy !== ''}>
          {busy === 'preview' ? 'Rendering…' : 'Preview PDF'}
        </button>
        <button className={buttonClass.primary} onClick={save} disabled={busy !== ''}>
          {busy === 'save' ? 'Saving…' : 'Save template'}
        </button>
        <button className={buttonClass.outline} onClick={saveAndBulk} disabled={busy !== ''}>
          Save → Bulk issue
        </button>
      </div>
      {error ? <div className="mb-4"><ErrorBox message={error} /></div> : null}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div
          ref={canvasRef}
          className="relative w-full select-none overflow-hidden rounded-md border border-border bg-white"
          style={{ aspectRatio: `${ratio}` }}
          onPointerMove={onPointerMove}
          onPointerUp={() => (dragState.current = null)}
        >
          {draft.background_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.background_url} alt="" className="absolute inset-0 h-full w-full object-fill" draggable={false} />
          ) : (
            <div className="absolute inset-0 border-8 border-[#06002e] bg-[#06002e]">
              <div className="absolute inset-3 rounded-sm border-2 border-[#d73cbe]" />
            </div>
          )}
          {draft.layout_json.map((f) => (
            <div
              key={f.key}
              onPointerDown={(e) => onPointerDown(e, f)}
              className={`absolute cursor-grab whitespace-nowrap border leading-none active:cursor-grabbing ${
                selectedKey === f.key ? 'border-[#d73cbe] bg-[#d73cbe]/10' : 'border-dashed border-[#d73cbe]/40'
              }`}
              style={{
                left: `${f.x}%`,
                top: `${f.y}%`,
                width: `${f.width}%`,
                color: f.color,
                fontSize: `${f.size * 0.9}px`,
                fontWeight: f.weight,
                textAlign: f.align,
                fontFamily: /times|serif/i.test(f.font) ? 'Times New Roman, serif' : 'Helvetica, Arial, sans-serif',
              }}
            >
              {f.sample || f.label || f.key}
            </div>
          ))}
        </div>

        <div>
          <Card className="!p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold">Fields</h2>
              <button className={buttonClass.ghost} onClick={addField}>+ Add field</button>
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {draft.layout_json.map((f) => (
                <li key={f.key}>
                  <button
                    onClick={() => setSelectedKey(f.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      selectedKey === f.key ? 'border-primary bg-primary/15' : 'border-border text-muted'
                    }`}
                  >
                    {f.key}
                  </button>
                </li>
              ))}
            </ul>

            {selected ? (
              <div className="mt-4 grid gap-3 border-t border-border pt-4 text-sm">
                <label className="grid gap-1">
                  <span className="text-xs text-muted">Field key (maps to sheet columns)</span>
                  <input
                    className={inputClass}
                    value={selected.key}
                    onChange={(e) => {
                      const key = e.target.value.replace(/[^a-zA-Z0-9_]/g, '_');
                      // Two fields with one key would merge — refuse collisions.
                      if (!key || draft.layout_json.some((f) => f.key === key && f.key !== selected.key)) return;
                      updateField(selected.key, { key });
                      setSelectedKey(key);
                    }}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-muted">Sample text (shown in designer + preview)</span>
                  <input className={inputClass} value={selected.sample} onChange={(e) => updateField(selected.key, { sample: e.target.value })} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <span className="text-xs text-muted">Size (pt)</span>
                    <input className={inputClass} type="number" min={6} max={120} value={selected.size} onChange={(e) => updateField(selected.key, { size: Number(e.target.value) })} />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-muted">Width (%)</span>
                    <input className={inputClass} type="number" min={1} max={100} value={selected.width} onChange={(e) => updateField(selected.key, { width: Number(e.target.value) })} />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-muted">Weight</span>
                    <select className={inputClass} value={selected.weight} onChange={(e) => updateField(selected.key, { weight: Number(e.target.value) })}>
                      <option value={400}>Regular</option>
                      <option value={700}>Bold</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-muted">Align</span>
                    <select className={inputClass} value={selected.align} onChange={(e) => updateField(selected.key, { align: e.target.value as CertificateField['align'] })}>
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-muted">Font</span>
                    <select className={inputClass} value={selected.font} onChange={(e) => updateField(selected.key, { font: e.target.value })}>
                      <option value="Helvetica">Helvetica (sans)</option>
                      <option value="Times">Times (serif)</option>
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-muted">Color</span>
                    <input className="h-9 w-full cursor-pointer rounded-sm border border-border bg-background" type="color" value={selected.color} onChange={(e) => updateField(selected.key, { color: e.target.value })} />
                  </label>
                </div>
                <button className={buttonClass.danger} onClick={() => removeField(selected.key)}>
                  Remove field
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">Select a field to edit its style, or drag it on the canvas to position it.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
