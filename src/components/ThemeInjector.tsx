"use client";

import { useContent } from "@/lib/SiteContentContext";
import { hexToRgbTriplet } from "@/lib/utils";

// Pushes the editable theme palette into CSS variables on the <html> element.
export default function ThemeInjector() {
  const { theme } = useContent();

  const css = `:root{
    --brand-orange:${hexToRgbTriplet(theme.orange)};
    --brand-orange-dark:${hexToRgbTriplet(theme.orangeDark)};
    --brand-orange-light:${hexToRgbTriplet(theme.orangeLight)};
    --brand-navy:${hexToRgbTriplet(theme.navy)};
    --brand-navy-dark:${hexToRgbTriplet(theme.navyDark)};
    --brand-navy-light:${hexToRgbTriplet(theme.navyLight)};
    --brand-cream:${hexToRgbTriplet(theme.cream)};
  }`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
