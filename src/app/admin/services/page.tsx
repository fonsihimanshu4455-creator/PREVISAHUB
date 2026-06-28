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

export default function ServicesPage() {
  const { draft, patch, setDraft, commit, ready, savedAt } = useAdminSection("services");
  if (!ready) return <Loading />;

  const items = draft.items;
  const setItems = (next: typeof items) => patch({ items: next });

  return (
    <div>
      <PageHeader title="Services" desc="The service cards shown in the Services section." />

      <div className="space-y-5">
        <Card title="Section heading">
          <TextInput label="Badge" value={draft.badge} onChange={(v) => patch({ badge: v })} />
          <TextInput label="Title" value={draft.title} onChange={(v) => patch({ title: v })} />
          <TextArea label="Subtitle" value={draft.subtitle} onChange={(v) => patch({ subtitle: v })} />
        </Card>

        <Card title="Service cards">
          <div className="space-y-4">
            {items.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Service {i + 1}</span>
                  <ItemToolbar
                    index={i}
                    count={items.length}
                    onUp={() => setItems(arrayMove(items, i, i - 1))}
                    onDown={() => setItems(arrayMove(items, i, i + 1))}
                    onRemove={() => setItems(arrayRemove(items, i))}
                  />
                </div>
                <TextInput label="Title" value={s.title} onChange={(v) => setItems(arrayUpdate(items, i, { title: v }))} />
                <TextArea label="Description" rows={2} value={s.desc} onChange={(v) => setItems(arrayUpdate(items, i, { desc: v }))} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <TextInput label="Icon (emoji)" value={s.icon} onChange={(v) => setItems(arrayUpdate(items, i, { icon: v }))} />
                  <NumberInput label="Icon size" value={s.iconSize} onChange={(v) => setItems(arrayUpdate(items, i, { iconSize: v }))} />
                </div>
                <ImageInput
                  label="Image (optional)"
                  hint="Upload an image to use instead of the emoji icon."
                  value={s.imageUrl}
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
                  {
                    icon: "✨",
                    imageUrl: null,
                    title: "New Service",
                    desc: "Describe this service.",
                    color: "from-brand-orange to-brand-orange-dark",
                    iconSize: 28,
                  },
                ],
              })
            }
            className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            + Add service
          </button>
        </Card>
      </div>

      <SaveBar onSave={commit} savedAt={savedAt} />
    </div>
  );
}
