"use client";

import { useAdminSection } from "@/lib/useAdminSection";
import {
  PageHeader,
  Card,
  TextInput,
  TextArea,
  NumberInput,
  ImageInput,
  SaveBar,
  Loading,
  ItemToolbar,
  arrayUpdate,
  arrayRemove,
  arrayMove,
} from "@/components/admin/ui";

export default function HeroPage() {
  const { draft, patch, setDraft, commit, ready, savedAt } = useAdminSection("hero");
  if (!ready) return <Loading />;

  const stats = draft.stats;
  const setStats = (next: typeof stats) => patch({ stats: next });

  return (
    <div>
      <PageHeader title="Hero Section" desc="The big banner at the top of the homepage." />

      <div className="space-y-5">
        <Card title="Headline">
          <TextInput label="Badge text" value={draft.badge} onChange={(v) => patch({ badge: v })} />
          <TextInput label="Title — start" value={draft.titleStart} onChange={(v) => patch({ titleStart: v })} />
          <TextInput label="Title — highlighted word" value={draft.titleHighlight} onChange={(v) => patch({ titleHighlight: v })} />
          <TextInput label="Title — end" value={draft.titleEnd} onChange={(v) => patch({ titleEnd: v })} />
          <TextArea label="Subtitle" value={draft.subtitle} onChange={(v) => patch({ subtitle: v })} />
        </Card>

        <Card title="Buttons">
          <TextInput label="Primary button" value={draft.primaryBtn} onChange={(v) => patch({ primaryBtn: v })} />
          <TextInput label="Secondary button" value={draft.secondaryBtn} onChange={(v) => patch({ secondaryBtn: v })} />
        </Card>

        <Card title="Hero card (right side)">
          <ImageInput
            label="Card image"
            hint="Leave empty to show the built-in logo graphic."
            value={draft.imageUrl}
            onChange={(v) => patch({ imageUrl: v })}
          />
          <NumberInput label="Image / logo size" value={draft.imageSize} onChange={(v) => patch({ imageSize: v })} />
          <TextInput label="Card title" value={draft.cardTitle} onChange={(v) => patch({ cardTitle: v })} />
          <TextInput label="Card subtitle" value={draft.cardSubtitle} onChange={(v) => patch({ cardSubtitle: v })} />
          <TextInput
            label="Tags"
            hint="Comma separated, e.g. IELTS, PTE, Visa, Admission"
            value={draft.tags.join(", ")}
            onChange={(v) => patch({ tags: v.split(",").map((t) => t.trim()).filter(Boolean) })}
          />
        </Card>

        <Card title="Statistics">
          <div className="space-y-3">
            {stats.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Stat {i + 1}</span>
                  <ItemToolbar
                    index={i}
                    count={stats.length}
                    onUp={() => setStats(arrayMove(stats, i, i - 1))}
                    onDown={() => setStats(arrayMove(stats, i, i + 1))}
                    onRemove={() => setStats(arrayRemove(stats, i))}
                  />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <TextInput label="Value" value={s.value} onChange={(v) => setStats(arrayUpdate(stats, i, { value: v }))} />
                  <TextInput label="Label" value={s.label} onChange={(v) => setStats(arrayUpdate(stats, i, { label: v }))} />
                  <NumberInput label="Value size" value={s.valueSize} onChange={(v) => setStats(arrayUpdate(stats, i, { valueSize: v }))} />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setDraft({ ...draft, stats: [...stats, { value: "0+", label: "New stat", valueSize: 30 }] })}
            className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            + Add stat
          </button>
        </Card>

        <Card title="Floating cards">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3 space-y-3">
              <p className="text-xs font-semibold text-slate-400">Card 1</p>
              <TextInput label="Icon (emoji)" value={draft.floatCard1.icon} onChange={(v) => patch({ floatCard1: { ...draft.floatCard1, icon: v } })} />
              <TextInput label="Title" value={draft.floatCard1.title} onChange={(v) => patch({ floatCard1: { ...draft.floatCard1, title: v } })} />
              <TextInput label="Subtitle" value={draft.floatCard1.sub} onChange={(v) => patch({ floatCard1: { ...draft.floatCard1, sub: v } })} />
            </div>
            <div className="rounded-xl border border-slate-200 p-3 space-y-3">
              <p className="text-xs font-semibold text-slate-400">Card 2</p>
              <TextInput label="Icon (emoji)" value={draft.floatCard2.icon} onChange={(v) => patch({ floatCard2: { ...draft.floatCard2, icon: v } })} />
              <TextInput label="Title" value={draft.floatCard2.title} onChange={(v) => patch({ floatCard2: { ...draft.floatCard2, title: v } })} />
              <TextInput label="Subtitle" value={draft.floatCard2.sub} onChange={(v) => patch({ floatCard2: { ...draft.floatCard2, sub: v } })} />
            </div>
          </div>
        </Card>
      </div>

      <SaveBar onSave={commit} savedAt={savedAt} />
    </div>
  );
}
