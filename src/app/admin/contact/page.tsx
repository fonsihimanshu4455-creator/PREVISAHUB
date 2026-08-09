"use client";

import { useAdminSection } from "@/lib/useAdminSection";
import {
  PageHeader,
  Card,
  TextInput,
  TextArea,
  SaveBar,
  Loading,
  ItemToolbar,
  arrayUpdate,
  arrayRemove,
  arrayMove,
} from "@/components/admin/ui";

export default function ContactPage() {
  const { draft, patch, setDraft, commit, ready, savedAt } = useAdminSection("contact");
  if (!ready) return <Loading />;

  const info = draft.info;
  const setInfo = (next: typeof info) => patch({ info: next });

  return (
    <div>
      <PageHeader title="Contact" desc="Contact section heading, info cards and the enquiry form dropdowns." />

      <div className="space-y-5">
        <Card title="Heading">
          <TextInput label="Badge" value={draft.badge} onChange={(v) => patch({ badge: v })} />
          <TextInput label="Title" value={draft.title} onChange={(v) => patch({ title: v })} />
          <TextArea label="Subtitle" value={draft.subtitle} onChange={(v) => patch({ subtitle: v })} />
          <TextInput label="Form title" value={draft.formTitle} onChange={(v) => patch({ formTitle: v })} />
        </Card>

        <Card title="Contact info cards">
          <div className="space-y-3">
            {info.map((c, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Card {i + 1}</span>
                  <ItemToolbar
                    index={i}
                    count={info.length}
                    onUp={() => setInfo(arrayMove(info, i, i - 1))}
                    onDown={() => setInfo(arrayMove(info, i, i + 1))}
                    onRemove={() => setInfo(arrayRemove(info, i))}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <TextInput label="Icon (emoji)" value={c.icon} onChange={(v) => setInfo(arrayUpdate(info, i, { icon: v }))} />
                  <TextInput label="Title" value={c.title} onChange={(v) => setInfo(arrayUpdate(info, i, { title: v }))} />
                </div>
                <TextInput label="Value (shown text)" value={c.value} onChange={(v) => setInfo(arrayUpdate(info, i, { value: v }))} />
                <TextInput
                  label="Link (optional)"
                  hint="e.g. tel:+91…, https://wa.me/…, or leave empty"
                  value={c.href}
                  onChange={(v) => setInfo(arrayUpdate(info, i, { href: v }))}
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => setDraft({ ...draft, info: [...info, { icon: "📍", title: "New", value: "", href: "" }] })}
            className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            + Add info card
          </button>
        </Card>

        <Card title="Form dropdowns" desc="One option per line. The first line is the placeholder.">
          <TextArea
            label="Country options"
            rows={7}
            value={draft.countries.join("\n")}
            onChange={(v) => patch({ countries: v.split("\n").map((s) => s.trimStart()).filter((s) => s.length) })}
          />
          <TextArea
            label="Service options"
            rows={7}
            value={draft.services.join("\n")}
            onChange={(v) => patch({ services: v.split("\n").map((s) => s.trimStart()).filter((s) => s.length) })}
          />
        </Card>
      </div>

      <SaveBar onSave={commit} savedAt={savedAt} />
    </div>
  );
}
