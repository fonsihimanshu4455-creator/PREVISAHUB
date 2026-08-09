"use client";

import { useAdminSection } from "@/lib/useAdminSection";
import {
  PageHeader,
  Card,
  TextInput,
  TextArea,
  NumberInput,
  SaveBar,
  Loading,
  ItemToolbar,
  arrayUpdate,
  arrayRemove,
  arrayMove,
} from "@/components/admin/ui";
import { NavLink } from "@/lib/content";

export default function FooterPage() {
  const { draft, patch, commit, ready, savedAt } = useAdminSection("footer");
  if (!ready) return <Loading />;

  const LinkList = ({
    label,
    list,
    onChange,
  }: {
    label: string;
    list: NavLink[];
    onChange: (next: NavLink[]) => void;
  }) => (
    <div className="space-y-3">
      {list.map((l, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">{label} {i + 1}</span>
            <ItemToolbar
              index={i}
              count={list.length}
              onUp={() => onChange(arrayMove(list, i, i - 1))}
              onDown={() => onChange(arrayMove(list, i, i + 1))}
              onRemove={() => onChange(arrayRemove(list, i))}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <TextInput label="Label" value={l.label} onChange={(v) => onChange(arrayUpdate(list, i, { label: v }))} />
            <TextInput label="Link target" value={l.href} onChange={(v) => onChange(arrayUpdate(list, i, { href: v }))} />
          </div>
        </div>
      ))}
      <button
        onClick={() => onChange([...list, { label: "New link", href: "#" }])}
        className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
      >
        + Add link
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader title="Footer" desc="The footer at the bottom of every page." />

      <div className="space-y-5">
        <Card title="About text & logo">
          <NumberInput label="Logo size" value={draft.logoSize} onChange={(v) => patch({ logoSize: v })} />
          <TextArea label="Description" value={draft.description} onChange={(v) => patch({ description: v })} />
        </Card>

        <Card title="Quick links column">
          <TextInput label="Column title" value={draft.quickLinksTitle} onChange={(v) => patch({ quickLinksTitle: v })} />
          <LinkList label="Link" list={draft.quickLinks} onChange={(next) => patch({ quickLinks: next })} />
        </Card>

        <Card title="Services column">
          <TextInput label="Column title" value={draft.servicesTitle} onChange={(v) => patch({ servicesTitle: v })} />
          <LinkList label="Link" list={draft.serviceLinks} onChange={(next) => patch({ serviceLinks: next })} />
        </Card>

        <Card title="Bottom bar">
          <TextInput
            label="Copyright"
            hint="The year is added automatically before this text."
            value={draft.copyright}
            onChange={(v) => patch({ copyright: v })}
          />
          <TextInput label="Right-side text" value={draft.madeWith} onChange={(v) => patch({ madeWith: v })} />
        </Card>
      </div>

      <SaveBar onSave={commit} savedAt={savedAt} />
    </div>
  );
}
