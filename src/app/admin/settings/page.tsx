"use client";

import { useState } from "react";
import { useAdminSection } from "@/lib/useAdminSection";
import { useAdminAuth } from "@/lib/adminAuth";
import {
  PageHeader,
  Card,
  TextInput,
  SaveBar,
  Loading,
} from "@/components/admin/ui";

export default function SettingsPage() {
  const { draft, patch, commit, ready, savedAt } = useAdminSection("global");
  const { changePassword } = useAdminAuth();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  if (!ready) return <Loading />;

  const savePassword = () => {
    if (pw1.length < 4) return setPwMsg("Password must be at least 4 characters.");
    if (pw1 !== pw2) return setPwMsg("Passwords do not match.");
    changePassword(pw1);
    setPw1("");
    setPw2("");
    setPwMsg("✓ Password updated.");
  };

  return (
    <div>
      <PageHeader
        title="Global Settings"
        desc="Business contact details used across the whole website (navbar, contact, footer, WhatsApp)."
      />

      <div className="space-y-5">
        <Card title="Business">
          <TextInput label="Brand name" value={draft.brandName} onChange={(v) => patch({ brandName: v })} />
          <TextInput label="Tagline" value={draft.tagline} onChange={(v) => patch({ tagline: v })} />
        </Card>

        <Card title="Contact details">
          <TextInput
            label="Phone (for call links)"
            hint="Include country code, no spaces. e.g. +918950991108"
            value={draft.phone}
            onChange={(v) => patch({ phone: v })}
          />
          <TextInput
            label="Phone (shown on site)"
            value={draft.phoneDisplay}
            onChange={(v) => patch({ phoneDisplay: v })}
          />
          <TextInput
            label="WhatsApp number"
            hint="Digits only with country code, no + or spaces. e.g. 918950991108"
            value={draft.whatsapp}
            onChange={(v) => patch({ whatsapp: v })}
          />
          <TextInput
            label="Instagram handle"
            value={draft.instagramHandle}
            onChange={(v) => patch({ instagramHandle: v })}
          />
          <TextInput
            label="Instagram URL"
            value={draft.instagramUrl}
            onChange={(v) => patch({ instagramUrl: v })}
          />
          <TextInput label="Email" value={draft.email} onChange={(v) => patch({ email: v })} />
          <TextInput
            label="Working hours"
            value={draft.workingHours}
            onChange={(v) => patch({ workingHours: v })}
          />
        </Card>

        <Card
          title="Admin password"
          desc="Change the password used to log in to this admin panel."
        >
          <TextInput label="New password" value={pw1} onChange={setPw1} />
          <TextInput label="Confirm password" value={pw2} onChange={setPw2} />
          {pwMsg && <p className="text-sm text-slate-600">{pwMsg}</p>}
          <button
            onClick={savePassword}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Update password
          </button>
        </Card>
      </div>

      <SaveBar onSave={commit} savedAt={savedAt} />
    </div>
  );
}
