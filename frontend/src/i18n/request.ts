import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./locales";

export default getRequestConfig(async () => {
  // Locale preference/default will be resolved from the API after auth and platform
  // configuration exist. Until then the runtime deliberately uses Russian messages.
  const locale = defaultLocale;
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});