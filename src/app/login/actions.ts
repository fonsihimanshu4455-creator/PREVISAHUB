"use server";

import { redirect } from "next/navigation";
import { checkPassword, createSession } from "@/lib/auth";

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  if (!password) {
    return { error: "Password is required." };
  }
  try {
    if (!checkPassword(password)) {
      return { error: "Incorrect password." };
    }
  } catch (err) {
    return { error: (err as Error).message };
  }
  createSession();
  redirect("/admin");
}
