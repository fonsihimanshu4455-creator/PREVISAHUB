"use client";

import { useAdminSection } from "@/lib/useAdminSection";
import {
  PageHeader,
  Card,
  Field,
  TextInput,
  TextArea,
  SaveBar,
  Loading,
  ItemToolbar,
  arrayUpdate,
  arrayRemove,
  arrayMove,
} from "@/components/admin/ui";

export default function AboutPage() {
  const { draft, patch, setDraft, commit, ready, savedAt } = useAdminSection("about");
  if (!ready) return <Loading />;

  const features = draft.features;
  const setFeatures = (next: typeof features) => patch({ features: next });
  const cards = draft.cards;
  const setCards = (next: typeof cards) => patch({ cards: next });

  return (
    <div>
      <PageHeader title="About" desc="The About Us section — your story, features and the stat cards." />

      <div className="space-y-5">
        <Card title="Heading & text">
          <TextInput label="Badge" value={draft.badge} onChange={(v) => patch({ badge: v })} />
          <TextInput label="Title — start" value={draft.titleStart} onChange={(v) => patch({ titleStart: v })} />
          <TextInput label="Title — highlighted word" value={draft.titleHighlight} onChange={(v) => patch({ titleHighlight: v })} />
          <TextArea label="Paragraph 1" value={draft.paragraph1} onChange={(v) => patch({ paragraph1: v })} />
          <TextArea label="Paragraph 2" value={draft.paragraph2} onChange={(v) => patch({ paragraph2: v })} />
          <TextInput label="Button text" value={draft.ctaLabel} onChange={(v) => patch({ ctaLabel: v })} />
        </Card>

        <Card title="Feature list">
          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Feature {i + 1}</span>
                  <ItemToolbar
                    index={i}
                    count={features.length}
                    onUp={() => setFeatures(arrayMove(features, i, i - 1))}
                    onDown={() => setFeatures(arrayMove(features, i, i + 1))}
                    onRemove={() => setFeatures(arrayRemove(features, i))}
                  />
                </div>
                <TextInput label="Title" value={f.title} onChange={(v) => setFeatures(arrayUpdate(features, i, { title: v }))} />
                <TextArea label="Description" rows={2} value={f.desc} onChange={(v) => setFeatures(arrayUpdate(features, i, { desc: v }))} />
              </div>
            ))}
          </div>
          <button
            onClick={() => setDraft({ ...draft, features: [...features, { title: "New feature", desc: "Describe it." }] })}
            className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            + Add feature
          </button>
        </Card>

        <Card title="Stat cards" desc="The four cards on the right (two number cards, two icon cards).">
          <div className="grid sm:grid-cols-2 gap-3">
            {cards.map((c, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-3">
                <p className="text-xs font-semibold text-slate-400">Card {i + 1}</p>
                <Field label="Type">
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={c.kind}
                    onChange={(e) =>
                      setCards(arrayUpdate(cards, i, { kind: e.target.value as "stat" | "icon" }))
                    }
                  >
                    <option value="stat">Number / stat</option>
                    <option value="icon">Icon</option>
                  </select>
                </Field>
                {c.kind === "stat" ? (
                  <TextInput label="Value" value={c.value} onChange={(v) => setCards(arrayUpdate(cards, i, { value: v }))} />
                ) : (
                  <TextInput label="Icon (emoji)" value={c.icon} onChange={(v) => setCards(arrayUpdate(cards, i, { icon: v }))} />
                )}
                <TextInput label="Label" value={c.label} onChange={(v) => setCards(arrayUpdate(cards, i, { label: v }))} />
                {c.kind === "icon" && (
                  <TextInput label="Sub-label" value={c.sub} onChange={(v) => setCards(arrayUpdate(cards, i, { sub: v }))} />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <SaveBar onSave={commit} savedAt={savedAt} />
    </div>
  );
}
