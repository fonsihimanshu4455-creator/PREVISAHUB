"use client";

import CrmBoard from "@/components/crm/CrmBoard";

// The admin sees every student; the API decides scope from the session role.
export default function AdminCrmPage() {
  return <CrmBoard />;
}
