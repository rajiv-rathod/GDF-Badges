'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import type { CertElement, CertElementType } from '@gdf/shared';
import { buttonClass, Card, ErrorBox, inputClass, PageTitle } from '@/components/ui';
import { CERT_PRESETS } from '../presets';

/** Loose editor element — a superset of every CertElement kind. */
type El = {
  id: string;
  type: CertElementType;
  x: number;
  y: number;
  width: number;
  height?: number;
  key?: string;
  label?: string;
  text?: string;
  font?: string;
  size?: number;
  weight?: number;
  align?: 'left' | 'center' | 'right';
  color?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  thickness?: number;
  sample?: string;
  vmode?: 'id' | 'url' | 'both';
  url?: string;
};

interface TemplateDraft {
  id: string | null;
  name: string;
  background_url: string;
  layout_json: unknown[];
  page_size: string;
}

const PAGE_RATIOS: Record<string, number> = {
  'A4-landscape': 297 / 210,
  'A4-portrait': 210 / 297,
  'letter-landscape': 11 / 8.5,
  'letter-portrait': 8.5 / 11,
};

const newId = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Normalise ANY browser-decodable image (PNG, JPG, WebP, SVG, GIF, AVIF, BMP…)
 * into a PNG (or JPEG when large) before upload. This means organizers can drop
 * in whatever they have, and the stored asset is always a format pdf-lib can
 * embed — so it renders both in the editor and on the final certificate PDF.
 */
async function normalizeImage(file: File): Promise<File> {
  const dataUrl: string = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(new Error('Could not read that file.'));
    fr.readAsDataURL(file);
  });
  const img: HTMLImageElement = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('That image could not be decoded. Try a PNG, JPG, WebP or SVG.'));
    im.src = dataUrl;
  });
  let w = img.naturalWidth || 1200;
  let h = img.naturalHeight || Math.round(w * 0.707); // SVGs may lack an intrinsic size
  const MAX = 2200;
  if (Math.max(w, h) > MAX) {
    const s = MAX / Math.max(w, h);
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const cx = canvas.getContext('2d');
  if (!cx) throw new Error('Could not process this image.');
  cx.drawImage(img, 0, 0, w, h);
  let blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  if (blob && blob.size > 4 * 1024 * 1024) {
    blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
  }
  if (!blob) throw new Error('Could not process this image (it may reference blocked external content).');
  const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
  return new File([blob], `image.${ext}`, { type: blob.type });
}

/** Normalise stored/legacy layout into editor elements (id + type always present). */
function normalize(raw: unknown[]): El[] {
  return (raw ?? []).map((r, i) => {
    const e = (r ?? {}) as Record<string, unknown>;
    const type = (e.type as CertElementType) || 'field';
    return {
      id: (e.id as string) || `el_${i}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      x: Number(e.x ?? 10),
      y: Number(e.y ?? 10),
      width: Number(e.width ?? 40),
      height: e.height != null ? Number(e.height) : undefined,
      key: e.key as string | undefined,
      label: e.label as string | undefined,
      text: e.text as string | undefined,
      font: (e.font as string) ?? 'Helvetica',
      size: e.size != null ? Number(e.size) : 16,
      weight: e.weight != null ? Number(e.weight) : 400,
      align: (e.align as El['align']) ?? 'left',
      color: (e.color as string) ?? '#1b1440',
      fill: e.fill as string | undefined,
      stroke: e.stroke as string | undefined,
      strokeWidth: e.strokeWidth != null ? Number(e.strokeWidth) : undefined,
      opacity: e.opacity != null ? Number(e.opacity) : undefined,
      thickness: e.thickness != null ? Number(e.thickness) : undefined,
      sample: e.sample as string | undefined,
      vmode: (e.vmode as El['vmode']) ?? 'both',
      url: e.url as string | undefined,
    };
  });
}

const TEXTUAL: CertElementType[] = ['field', 'text', 'verification'];

export function Designer({ orgId, orgSlug, template }: { orgId: string; orgSlug: string; template: TemplateDraft }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(template.name);
  const [pageSize, setPageSize] = useState(template.page_size);
  const [bgUrl, setBgUrl] = useState(template.background_url);
  const [templateId, setTemplateId] = useState(template.id);
  const [els, setEls] = useState<El[]>(() => normalize(template.layout_json));
  const [selId, setSelId] = useState<string | null>(els[0]?.id ?? null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPresets, setShowPresets] = useState(els.length === 0);

  const drag = useRef<{ id: string; mode: 'move' | 'resize'; ox: number; oy: number; sw: number; sh: number } | null>(null);
  const ratio = PAGE_RATIOS[pageSize] ?? PAGE_RATIOS['A4-landscape'];
  const selected = useMemo(() => els.find((e) => e.id === selId) ?? null, [els, selId]);

  function patch(id: string, p: Partial<El>) {
    setEls((list) => list.map((e) => (e.id === id ? { ...e, ...p } : e)));
  }

  function loadPreset(presetId: string) {
    const preset = CERT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setEls(normalize(preset.layout() as unknown[]));
    setPageSize(preset.page_size);
    setBgUrl('');
    setShowPresets(false);
    setSelId(null);
  }

  // ---- drag / resize ----
  function onPointerDownEl(e: React.PointerEvent, el: El, mode: 'move' | 'resize') {
    e.stopPropagation();
    const rect = canvasRef.current!.getBoundingClientRect();
    drag.current = {
      id: el.id,
      mode,
      ox: e.clientX - (rect.left + (el.x / 100) * rect.width),
      oy: e.clientY - (rect.top + (el.y / 100) * rect.height),
      sw: el.width,
      sh: el.height ?? 10,
    };
    setSelId(el.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const el = els.find((x) => x.id === drag.current!.id);
    if (!el) return;
    if (drag.current.mode === 'move') {
      const x = Math.min(99, Math.max(-5, ((e.clientX - drag.current.ox - rect.left) / rect.width) * 100));
      const y = Math.min(99, Math.max(-5, ((e.clientY - drag.current.oy - rect.top) / rect.height) * 100));
      patch(el.id, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    } else {
      const w = Math.min(150, Math.max(2, ((e.clientX - rect.left) / rect.width) * 100 - el.x));
      const p: Partial<El> = { width: Math.round(w * 10) / 10 };
      if (!TEXTUAL.includes(el.type)) {
        const h = Math.min(150, Math.max(1, ((e.clientY - rect.top) / rect.height) * 100 - el.y));
        p.height = Math.round(h * 10) / 10;
      }
      patch(el.id, p);
    }
  }

  // ---- add elements ----
  function add(type: CertElementType, extra: Partial<El> = {}) {
    // Type defaults first, then `extra` wins last (so a passed-in url/text is kept).
    const base: El = {
      id: newId(type),
      type,
      x: 20,
      y: 20,
      width: type === 'line' ? 40 : type === 'image' ? 18 : 50,
      font: 'Helvetica',
      size: 18,
      weight: 400,
      align: 'left',
      color: '#1b1440',
    };
    if (type === 'rect' || type === 'ellipse') Object.assign(base, { height: 12, fill: '#d73cbe', opacity: 1 });
    if (type === 'line') Object.assign(base, { height: 0, color: '#1b1440', thickness: 1.5 });
    if (type === 'image') Object.assign(base, { height: 18, opacity: 1, url: '' });
    if (type === 'text') Object.assign(base, { text: 'New text' });
    if (type === 'field') Object.assign(base, { key: uniqueKey(), sample: 'Sample text' });
    if (type === 'verification') Object.assign(base, { vmode: 'both', size: 8, color: '#6f6690', width: 60, y: 90 });
    Object.assign(base, extra);
    setEls((l) => [...l, base]);
    setSelId(base.id);
  }

  function uniqueKey() {
    let i = 1;
    while (els.some((e) => e.key === `field_${i}`)) i += 1;
    return `field_${i}`;
  }

  function remove(id: string) {
    setEls((l) => l.filter((e) => e.id !== id));
    if (selId === id) setSelId(null);
  }
  function reorder(id: string, dir: 1 | -1) {
    setEls((l) => {
      const i = l.findIndex((e) => e.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= l.length) return l;
      const copy = [...l];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  const hasVerification = els.some((e) => e.type === 'verification');

  // ---- uploads ----
  async function upload(file: File): Promise<string | null> {
    const normalized = await normalizeImage(file); // any format → PNG/JPEG
    const form = new FormData();
    form.set('org_id', orgId);
    form.set('file', normalized);
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Upload failed');
    return data.url as string;
  }
  /** True for decorative rects that blanket (almost) the whole page. */
  const isFullPageRect = (e: El) =>
    e.type === 'rect' && e.x <= 1 && e.y <= 1 && e.width >= 98 && (e.height ?? 0) >= 98 && e.fill !== 'none';

  async function uploadBackground(file: File) {
    setBusy('upload'); setError('');
    try {
      const url = (await upload(file)) ?? '';
      setBgUrl(url);
      // A preset's full-page colour rect would sit ON TOP of the uploaded
      // background and hide it — drop those automatically.
      if (url) {
        setEls((l) => {
          const kept = l.filter((e) => !isFullPageRect(e));
          if (kept.length !== l.length) setNotice('Removed the full-page colour layer so your background shows through.');
          return kept;
        });
      }
    } catch (err) { setError((err as Error).message); } finally { setBusy(''); }
  }
  async function uploadImageEl(file: File) {
    setBusy('img'); setError('');
    try {
      const url = await upload(file);
      if (url) add('image', { url });
    } catch (err) { setError((err as Error).message); } finally { setBusy(''); }
  }

  // ---- persist / preview ----
  async function save(): Promise<string | null> {
    setBusy('save'); setError('');
    try {
      const res = await fetch('/api/certificates/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId ?? undefined, org_id: orgId, name, background_url: bgUrl, page_size: pageSize, layout_json: els as unknown as CertElement[] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setTemplateId(data.id);
      return data.id;
    } catch (err) { setError((err as Error).message); return null; } finally { setBusy(''); }
  }

  async function preview() {
    setBusy('preview'); setError('');
    const tab = window.open('about:blank', '_blank');
    try {
      const res = await fetch('/api/certificates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, background_url: bgUrl, layout_json: els, page_size: pageSize, values: {} }),
      });
      if (!res.ok) throw new Error('Preview failed');
      const url = URL.createObjectURL(await res.blob());
      if (tab) tab.location.href = url; else window.location.href = url;
    } catch (err) { tab?.close(); setError((err as Error).message); } finally { setBusy(''); }
  }

  async function saveAndBulk() {
    const id = await save();
    if (id) router.push(`/org/${orgSlug}/certificates/${id}/bulk`);
  }

  return (
    <>
      <PageTitle title="Certificate designer" subtitle="Design like Canva — add text, fields, logos, shapes and a verification stamp. The canvas matches the PDF 1:1." />

      {/* toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className={`${inputClass} max-w-xs`} value={name} onChange={(e) => setName(e.target.value)} />
        <select className={`${inputClass} max-w-44`} value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
          {Object.keys(PAGE_RATIOS).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className={buttonClass.ghost} onClick={() => setShowPresets((s) => !s)}>Templates</button>
        <div className="ml-auto flex gap-2">
          <button className={buttonClass.outline} onClick={preview} disabled={busy !== ''}>{busy === 'preview' ? 'Rendering…' : 'Preview PDF'}</button>
          <button className={buttonClass.primary} onClick={save} disabled={busy !== ''}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
          <button className={buttonClass.outline} onClick={saveAndBulk} disabled={busy !== ''}>Save → Bulk issue</button>
        </div>
      </div>

      {showPresets ? (
        <Card className="mb-4 !p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold">Start from a premade design</h2>
            <button className="text-xs text-muted hover:text-foreground" onClick={() => setShowPresets(false)}>Close</button>
          </div>
          <div className="mt-3 grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-6">
            {CERT_PRESETS.map((p) => (
              <button key={p.id} onClick={() => loadPreset(p.id)} className="group overflow-hidden rounded-lg border border-border text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                <div className="relative flex aspect-[1.414] items-center justify-center" style={{ background: p.tileBg }}>
                  <span className="absolute inset-2 rounded-sm border" style={{ borderColor: p.accent, opacity: 0.6 }} />
                  <span className="px-2 text-center font-display text-[11px] font-bold leading-tight" style={{ color: p.accent }}>{p.name.split(' · ')[1] ?? p.name}</span>
                </div>
                <p className="truncate px-2 py-1.5 text-[11px] font-semibold text-muted group-hover:text-foreground">{p.name}</p>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {error ? <div className="mb-4"><ErrorBox message={error} /></div> : null}
      {notice ? <p className="mb-4 rounded-sm border border-primary/50 bg-primary/10 px-4 py-2 text-sm">{notice}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        {/* canvas */}
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5 text-xs">
            <span className="mr-1 self-center font-semibold text-muted">Add:</span>
            <PaletteBtn onClick={() => add('text')}>Text</PaletteBtn>
            <PaletteBtn onClick={() => add('field')}>Field</PaletteBtn>
            <PaletteBtn onClick={() => imageInput.current?.click()}>{busy === 'img' ? 'Uploading…' : 'Image / logo'}</PaletteBtn>
            <PaletteBtn onClick={() => add('rect')}>Rectangle</PaletteBtn>
            <PaletteBtn onClick={() => add('ellipse')}>Ellipse</PaletteBtn>
            <PaletteBtn onClick={() => add('line')}>Line</PaletteBtn>
            <PaletteBtn onClick={() => add('verification')} disabled={hasVerification}>Certificate ID</PaletteBtn>
            <button className="ml-auto rounded-full border border-border px-3 py-1 font-semibold text-muted hover:border-primary" onClick={() => fileInput.current?.click()} disabled={busy !== ''}>
              {busy === 'upload' ? 'Uploading…' : bgUrl ? 'Replace background' : 'Upload background'}
            </button>
            {bgUrl ? <button className="rounded-full border border-border px-3 py-1 font-semibold text-muted hover:border-danger" onClick={() => setBgUrl('')}>Clear bg</button> : null}
          </div>

          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadBackground(e.target.files[0]); e.target.value = ''; }} />
          <input ref={imageInput} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadImageEl(e.target.files[0]); e.target.value = ''; }} />

          <div
            ref={canvasRef}
            className="relative w-full select-none overflow-hidden rounded-md border border-border bg-white shadow-inner"
            style={{ aspectRatio: `${ratio}` }}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerDown={() => setSelId(null)}
          >
            {bgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bgUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-fill" draggable={false} />
            ) : null}
            {els.map((el) => (
              <ElementView key={el.id} el={el} selected={selId === el.id} onDown={onPointerDownEl} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Drag to move · drag the corner handle to resize · click empty space to deselect.</p>
        </div>

        {/* right rail: layers + properties */}
        <div className="flex flex-col gap-4">
          <Card className="!p-4">
            <h2 className="font-display font-semibold">Layers</h2>
            <ul className="mt-2 flex flex-col gap-1">
              {els.map((el) => (
                <li key={el.id} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${selId === el.id ? 'border-primary bg-primary/10' : 'border-border'}`}>
                  <button className="flex-1 text-left font-semibold" onClick={() => setSelId(el.id)}>
                    <span className="text-muted">{labelFor(el)}</span>
                  </button>
                  <button title="Bring forward" className="text-muted hover:text-foreground" onClick={() => reorder(el.id, 1)}>▲</button>
                  <button title="Send back" className="text-muted hover:text-foreground" onClick={() => reorder(el.id, -1)}>▼</button>
                  {el.type === 'verification' ? null : (
                    <button title="Delete" className="text-danger hover:opacity-70" onClick={() => remove(el.id)}>✕</button>
                  )}
                </li>
              ))}
              {els.length === 0 ? <li className="text-xs text-muted">Nothing yet — add elements or pick a template.</li> : null}
            </ul>
          </Card>

          <Card className="!p-4">
            <h2 className="font-display font-semibold">Properties</h2>
            {selected ? <Properties el={selected} patch={patch} /> : <p className="mt-3 text-sm text-muted">Select an element to edit it.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}

function PaletteBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="rounded-full border border-border px-3 py-1 font-semibold text-foreground transition hover:border-primary disabled:opacity-40">
      {children}
    </button>
  );
}

function labelFor(el: El) {
  if (el.type === 'field') return `Field · ${el.key}`;
  if (el.type === 'text') return `Text · ${(el.text ?? '').slice(0, 16) || 'text'}`;
  if (el.type === 'verification') return 'Certificate ID';
  if (el.type === 'image') return 'Image / logo';
  return el.type.charAt(0).toUpperCase() + el.type.slice(1);
}

function ElementView({ el, selected, onDown }: { el: El; selected: boolean; onDown: (e: React.PointerEvent, el: El, mode: 'move' | 'resize') => void }) {
  const common: React.CSSProperties = { left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%` };
  const ring = selected ? 'outline outline-2 outline-[#d73cbe]' : '';
  const handle = selected ? (
    <span
      onPointerDown={(e) => onDown(e, el, 'resize')}
      className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-full border border-white bg-[#d73cbe]"
    />
  ) : null;

  if (el.type === 'image') {
    return (
      <div className={`absolute cursor-grab ${ring}`} style={{ ...common, height: `${el.height}%`, opacity: el.opacity ?? 1 }} onPointerDown={(e) => onDown(e, el, 'move')}>
        {el.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={el.url} alt="" className="h-full w-full object-contain" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-primary/50 text-[10px] text-muted">image</div>
        )}
        {handle}
      </div>
    );
  }
  if (el.type === 'rect' || el.type === 'ellipse') {
    const noFill = !el.fill || el.fill === 'none';
    return (
      <div
        className={`absolute cursor-grab ${ring}`}
        style={{
          ...common,
          height: `${el.height}%`,
          background: noFill ? 'transparent' : el.fill,
          border: el.stroke ? `${el.strokeWidth ?? 1}px solid ${el.stroke}` : noFill ? '1px dashed rgba(215,60,190,0.5)' : undefined,
          borderRadius: el.type === 'ellipse' ? '50%' : undefined,
          opacity: el.opacity ?? 1,
        }}
        onPointerDown={(e) => onDown(e, el, 'move')}
      >
        {handle}
      </div>
    );
  }
  if (el.type === 'line') {
    return (
      <div className={`absolute cursor-grab ${ring}`} style={{ ...common, height: `${Math.max(2, el.thickness ?? 1.5)}px`, background: el.color }} onPointerDown={(e) => onDown(e, el, 'move')}>
        {handle}
      </div>
    );
  }
  // textual
  const content = el.type === 'text' ? el.text : el.type === 'verification' ? 'Certificate ID: GDF-XXXX · certview.gdf.social/verify/…' : el.sample || el.key;
  return (
    <div
      className={`absolute cursor-grab whitespace-pre-wrap leading-tight ${ring} ${selected ? '' : 'hover:outline hover:outline-1 hover:outline-[#d73cbe]/40'}`}
      style={{
        ...common,
        color: el.color,
        fontSize: `${(el.size ?? 16) * 0.9}px`,
        fontWeight: el.weight,
        textAlign: el.align,
        fontFamily: /times|serif/i.test(el.font ?? '') ? 'Times New Roman, serif' : 'Helvetica, Arial, sans-serif',
      }}
      onPointerDown={(e) => onDown(e, el, 'move')}
    >
      {content}
      {handle}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

function Properties({ el, patch }: { el: El; patch: (id: string, p: Partial<El>) => void }) {
  const set = (p: Partial<El>) => patch(el.id, p);
  const textual = TEXTUAL.includes(el.type);
  return (
    <div className="mt-3 grid gap-3 text-sm">
      <div className="grid grid-cols-3 gap-2">
        <Field label="X %"><input className={inputClass} type="number" value={el.x} onChange={(e) => set({ x: Number(e.target.value) })} /></Field>
        <Field label="Y %"><input className={inputClass} type="number" value={el.y} onChange={(e) => set({ y: Number(e.target.value) })} /></Field>
        <Field label="W %"><input className={inputClass} type="number" value={el.width} onChange={(e) => set({ width: Number(e.target.value) })} /></Field>
      </div>

      {el.type === 'field' ? (
        <>
          <Field label="Field key (maps to a sheet column)">
            <input className={inputClass} value={el.key ?? ''} onChange={(e) => set({ key: e.target.value.replace(/[^a-zA-Z0-9_]/g, '_') })} />
          </Field>
          <Field label="Sample text (designer + preview)">
            <input className={inputClass} value={el.sample ?? ''} onChange={(e) => set({ sample: e.target.value })} />
          </Field>
        </>
      ) : null}

      {el.type === 'text' ? (
        <Field label="Text"><input className={inputClass} value={el.text ?? ''} onChange={(e) => set({ text: e.target.value })} /></Field>
      ) : null}

      {el.type === 'verification' ? (
        <Field label="Show">
          <select className={inputClass} value={el.vmode ?? 'both'} onChange={(e) => set({ vmode: e.target.value as El['vmode'] })}>
            <option value="both">Certificate ID + verify URL</option>
            <option value="id">Certificate ID only</option>
            <option value="url">Verify URL only</option>
          </select>
        </Field>
      ) : null}

      {textual ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Size (pt)"><input className={inputClass} type="number" min={4} max={200} value={el.size} onChange={(e) => set({ size: Number(e.target.value) })} /></Field>
          <Field label="Weight">
            <select className={inputClass} value={el.weight} onChange={(e) => set({ weight: Number(e.target.value) })}><option value={400}>Regular</option><option value={700}>Bold</option></select>
          </Field>
          <Field label="Align">
            <select className={inputClass} value={el.align} onChange={(e) => set({ align: e.target.value as El['align'] })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>
          </Field>
          <Field label="Font">
            <select className={inputClass} value={el.font} onChange={(e) => set({ font: e.target.value })}><option value="Helvetica">Helvetica (sans)</option><option value="Times">Times (serif)</option></select>
          </Field>
          <Field label="Color"><input className="h-9 w-full cursor-pointer rounded-sm border border-border" type="color" value={el.color} onChange={(e) => set({ color: e.target.value })} /></Field>
        </div>
      ) : null}

      {el.type === 'rect' || el.type === 'ellipse' ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Height %"><input className={inputClass} type="number" value={el.height ?? 10} onChange={(e) => set({ height: Number(e.target.value) })} /></Field>
          <Field label="Opacity"><input className={inputClass} type="number" step={0.05} min={0} max={1} value={el.opacity ?? 1} onChange={(e) => set({ opacity: Number(e.target.value) })} /></Field>
          <Field label="Fill">
            <div className="flex gap-1">
              <input className="h-9 w-full cursor-pointer rounded-sm border border-border" type="color" value={el.fill && el.fill !== 'none' ? el.fill : '#d73cbe'} onChange={(e) => set({ fill: e.target.value })} />
              <button className="rounded-sm border border-border px-2 text-xs text-muted" onClick={() => set({ fill: 'none' })}>None</button>
            </div>
          </Field>
          <Field label="Border width"><input className={inputClass} type="number" min={0} max={40} value={el.strokeWidth ?? 0} onChange={(e) => set({ strokeWidth: Number(e.target.value), stroke: el.stroke ?? '#1b1440' })} /></Field>
          <Field label="Border color"><input className="h-9 w-full cursor-pointer rounded-sm border border-border" type="color" value={el.stroke ?? '#1b1440'} onChange={(e) => set({ stroke: e.target.value })} /></Field>
        </div>
      ) : null}

      {el.type === 'line' ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Thickness (pt)"><input className={inputClass} type="number" min={0.2} max={40} step={0.2} value={el.thickness ?? 1.5} onChange={(e) => set({ thickness: Number(e.target.value) })} /></Field>
          <Field label="Color"><input className="h-9 w-full cursor-pointer rounded-sm border border-border" type="color" value={el.color} onChange={(e) => set({ color: e.target.value })} /></Field>
        </div>
      ) : null}

      {el.type === 'image' ? (
        <Field label="Opacity"><input className={inputClass} type="number" step={0.05} min={0} max={1} value={el.opacity ?? 1} onChange={(e) => set({ opacity: Number(e.target.value) })} /></Field>
      ) : null}
    </div>
  );
}
