"use client";

import { useAdminSection } from "@/lib/useAdminSection";
import {
  PageHeader,
  Card,
  TextInput,
  NumberInput,
  Toggle,
  SaveBar,
  Loading,
  ItemToolbar,
  arrayUpdate,
  arrayRemove,
  arrayMove,
} from "@/components/admin/ui";

export default function NavbarPage() {
  const { draft, patch, setDraft, commit, ready, savedAt } = useAdminSection("navbar");
  if (!ready) return <Loading />;

  const links = draft.links;
  const setLinks = (next: typeof links) => patch({ links: next });

  return (
    <div>
      <PageHeader title="Navbar" desc="Top navigation menu links and the top-bar button." />

      <div className="space-y-5">
        <Card title="Top bar">
          <NumberInput label="Logo size in navbar" value={draft.logoSize} onChange={(v) => patch({ logoSize: v })} />
          <TextInput label="Button text" value={draft.ctaLabel} onChange={(v) => patch({ ctaLabel: v })} />
          <Toggle label="Show phone number" value={draft.showPhone} onChange={(v) => patch({ showPhone: v })} />
        </Card>

        <Card title="Menu links" desc="The links shown in the navigation menu.">
          <div className="space-y-3">
            {links.map((l, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Link {i + 1}</span>
                  <ItemToolbar
                    index={i}
                    count={links.length}
                    onUp={() => setLinks(arrayMove(links, i, i - 1))}
                    onDown={() => setLinks(arrayMove(links, i, i + 1))}
                    onRemove={() => setLinks(arrayRemove(links, i))}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <TextInput label="Label" value={l.label} onChange={(v) => setLinks(arrayUpdate(links, i, { label: v }))} />
                  <TextInput
                    label="Link target"
                    hint="e.g. #services or https://…"
                    value={l.href}
                    onChange={(v) => setLinks(arrayUpdate(links, i, { href: v }))}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setDraft({ ...draft, links: [...links, { label: "New link", href: "#" }] })}
            className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            + Add link
          </button>
        </Card>
      </div>

      <SaveBar onSave={commit} savedAt={savedAt} />
    </div>
  );
}
