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

export default function CountriesPage() {
  const { draft, patch, setDraft, commit, ready, savedAt } = useAdminSection("countries");
  if (!ready) return <Loading />;

  const items = draft.items;
  const setItems = (next: typeof items) => patch({ items: next });

  return (
    <div>
      <PageHeader title="Countries" desc="Destination cards shown in the Countries section." />

      <div className="space-y-5">
        <Card title="Section heading">
          <TextInput label="Badge" value={draft.badge} onChange={(v) => patch({ badge: v })} />
          <TextInput label="Title" value={draft.title} onChange={(v) => patch({ title: v })} />
          <TextInput label="Title — highlighted word" value={draft.titleHighlight} onChange={(v) => patch({ titleHighlight: v })} />
          <TextArea label="Subtitle" value={draft.subtitle} onChange={(v) => patch({ subtitle: v })} />
        </Card>

        <Card title="Destinations">
          <div className="space-y-4">
            {items.map((c, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Country {i + 1}</span>
                  <ItemToolbar
                    index={i}
                    count={items.length}
                    onUp={() => setItems(arrayMove(items, i, i - 1))}
                    onDown={() => setItems(arrayMove(items, i, i + 1))}
                    onRemove={() => setItems(arrayRemove(items, i))}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <TextInput label="Name" value={c.name} onChange={(v) => setItems(arrayUpdate(items, i, { name: v }))} />
                  <TextInput label="Universities count" value={c.universities} onChange={(v) => setItems(arrayUpdate(items, i, { universities: v }))} />
                </div>
                <TextArea label="Description" rows={2} value={c.desc} onChange={(v) => setItems(arrayUpdate(items, i, { desc: v }))} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <TextInput label="Flag (emoji)" value={c.flag} onChange={(v) => setItems(arrayUpdate(items, i, { flag: v }))} />
                  <NumberInput label="Flag / image size" value={c.flagSize} onChange={(v) => setItems(arrayUpdate(items, i, { flagSize: v }))} />
                </div>
                <ImageInput
                  label="Image (optional)"
                  hint="Upload a flag or photo to use instead of the emoji."
                  value={c.imageUrl}
                  onChange={(v) => setItems(arrayUpdate(items, i, { imageUrl: v }))}
                />
              </div>
            ))}
          </div>
          <button
            onClick={() =>
              setDraft({
                ...draft,
                items: [
                  ...items,
                  { name: "New Country", flag: "🏳️", imageUrl: null, desc: "Describe this destination.", universities: "0+", flagSize: 48 },
                ],
              })
            }
            className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            + Add country
          </button>
        </Card>
      </div>

      <SaveBar onSave={commit} savedAt={savedAt} />
    </div>
  );
}
