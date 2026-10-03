import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
export default function NotFound() {
  const t = useTranslations();
  return (
    <main className="container mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold">{t("errors.notFoundTitle")}</h1>
      <p className="mt-4">{t("errors.notFoundDescription")}</p>
      <Link href="/" className="mt-6 inline-block underline">
        K-Fondo
      </Link>
    </main>
  );
}
