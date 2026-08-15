"use client";

import { useRouter } from "next/navigation";
import StaffLogin from "@/components/staff/StaffLogin";

/** The sign-in for the calling panel. Reloads so the server renders the list. */
export default function CallingLogin() {
  const router = useRouter();
  return (
    <StaffLogin
      expect="telecaller"
      icon="phone"
      title="Calling Panel"
      subtitle="Sign in to see the numbers assigned to you."
      otherLabel="Counsellor?"
      otherHref="/staff"
      onLogin={() => router.refresh()}
    />
  );
}
