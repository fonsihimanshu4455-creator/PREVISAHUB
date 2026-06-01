"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroySession } from "@/lib/auth";
import {
  saveHero,
  saveServices,
  saveCountries,
  saveAbout,
  saveContact,
} from "@/lib/content";
import type {
  Hero,
  Service,
  Country,
  About,
  Contact,
  Feature,
} from "@/lib/content-types";

function refreshSite() {
  revalidatePath("/");
}

export async function logoutAction() {
  destroySession();
  redirect("/login");
}

export async function updateHeroAction(formData: FormData) {
  const hero: Hero = {
    badge: String(formData.get("badge") ?? ""),
    titlePrefix: String(formData.get("titlePrefix") ?? ""),
    titleHighlight: String(formData.get("titleHighlight") ?? ""),
    titleSuffix: String(formData.get("titleSuffix") ?? ""),
    description: String(formData.get("description") ?? ""),
    primaryCtaText: String(formData.get("primaryCtaText") ?? ""),
    secondaryCtaText: String(formData.get("secondaryCtaText") ?? ""),
    stat1Value: String(formData.get("stat1Value") ?? ""),
    stat1Label: String(formData.get("stat1Label") ?? ""),
    stat2Value: String(formData.get("stat2Value") ?? ""),
    stat2Label: String(formData.get("stat2Label") ?? ""),
    stat3Value: String(formData.get("stat3Value") ?? ""),
    stat3Label: String(formData.get("stat3Label") ?? ""),
  };
  await saveHero(hero);
  refreshSite();
  revalidatePath("/admin/hero");
}

export async function updateServicesAction(payload: string) {
  const services = JSON.parse(payload) as Service[];
  await saveServices(services);
  refreshSite();
  revalidatePath("/admin/services");
}

export async function updateCountriesAction(payload: string) {
  const countries = JSON.parse(payload) as Country[];
  await saveCountries(countries);
  refreshSite();
  revalidatePath("/admin/countries");
}

export async function updateAboutAction(payload: string) {
  const data = JSON.parse(payload) as About & { features: Feature[] };
  await saveAbout(data);
  refreshSite();
  revalidatePath("/admin/about");
}

export async function updateContactAction(formData: FormData) {
  const contact: Contact = {
    phoneDisplay: String(formData.get("phoneDisplay") ?? ""),
    phoneRaw: String(formData.get("phoneRaw") ?? ""),
    whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
    instagramHandle: String(formData.get("instagramHandle") ?? ""),
    instagramUrl: String(formData.get("instagramUrl") ?? ""),
    workingHours: String(formData.get("workingHours") ?? ""),
  };
  await saveContact(contact);
  refreshSite();
  revalidatePath("/admin/contact");
}
