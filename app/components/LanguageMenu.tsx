import { Button, Menu } from "@mantine/core";
import { IconCheck, IconLanguage } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { LOCALES, LOCALE_NAMES } from "@code-royale/content";
import { useLocale } from "~/i18n";

/** Picks the game's language. Each language is listed under its own name. */
export function LanguageMenu() {
  const { t } = useTranslation();
  const [locale, setLocale] = useLocale();
  return (
    <Menu position="bottom-end" withArrow>
      <Menu.Target>
        <Button
          variant="light"
          color="gray"
          leftSection={<IconLanguage size={18} />}
          aria-label={t("header.language")}
        >
          {locale.toUpperCase()}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t("header.language")}</Menu.Label>
        {LOCALES.map((l) => (
          <Menu.Item
            key={l}
            lang={l}
            onClick={() => setLocale(l)}
            rightSection={l === locale ? <IconCheck size={14} /> : null}
          >
            {LOCALE_NAMES[l]}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
