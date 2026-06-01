"use client";

import { useTransition } from "react";
import { updateContactAction } from "../actions";
import { Field, FormCard, SaveBar, TextInput, useSaveState } from "../_ui";
import type { Contact } from "@/lib/content-types";

export default function ContactForm({ initial }: { initial: Contact }) {
  const { saving, setSaving, message, setMessage, error, setError } = useSaveState();
  const [, startTransition] = useTransition();

  return (
    <FormCard
      title="Contact Info"
      description="Phone, WhatsApp, Instagram and working hours. These show in the Contact section, footer and floating button."
    >
      <form
        action={(formData) => {
          setError(null);
          setMessage(null);
          setSaving(true);
          startTransition(async () => {
            try {
              await updateContactAction(formData);
              setMessage("Saved. Changes are live on the website.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setSaving(false);
            }
          });
        }}
        className="space-y-4"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Phone (display format)">
            <TextInput name="phoneDisplay" defaultValue={initial.phoneDisplay} required />
          </Field>
          <Field label="Phone (tel: format — digits with +)">
            <TextInput
              name="phoneRaw"
              defaultValue={initial.phoneRaw}
              placeholder="+918950991108"
              required
            />
          </Field>
        </div>

        <Field label="WhatsApp number (digits only, with country code)">
          <TextInput
            name="whatsappNumber"
            defaultValue={initial.whatsappNumber}
            placeholder="918950991108"
            required
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Instagram handle">
            <TextInput
              name="instagramHandle"
              defaultValue={initial.instagramHandle}
              placeholder="@pre.visa.hub_9"
            />
          </Field>
          <Field label="Instagram URL">
            <TextInput
              name="instagramUrl"
              defaultValue={initial.instagramUrl}
              placeholder="https://www.instagram.com/pre.visa.hub_9/"
            />
          </Field>
        </div>

        <Field label="Working hours">
          <TextInput name="workingHours" defaultValue={initial.workingHours} required />
        </Field>

        <SaveBar saving={saving} message={message} error={error} />
      </form>
    </FormCard>
  );
}
