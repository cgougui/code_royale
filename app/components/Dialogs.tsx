import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { Trans, useTranslation } from "react-i18next";
import type { Level } from "@code-royale/content";
import { CrownLogo } from "./Icons";

const STEP_ICONS = ["✏️", "⚔️", "⭐"];

export function WelcomeModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const steps = t("welcome.steps", { returnObjects: true });
  return (
    <Modal opened={opened} onClose={onClose} centered size="lg" withCloseButton={false} radius="lg">
      <Stack align="center" gap="md" p="md">
        <CrownLogo size={84} />
        <Text fw={700} fz={34} ta="center" lh={1.1}>
          {t("welcome.title")}
        </Text>
        <Text c="dimmed" ta="center">
          <Trans i18nKey="welcome.intro" components={{ b: <b /> }} />
        </Text>
        <Stack gap="sm" w="100%">
          {steps.map((s, i) => (
            <Group key={s.title} gap="md" wrap="nowrap" className="cr-panel" p="sm">
              <Text fz={34}>{STEP_ICONS[i]}</Text>
              <div>
                <Text fw={700}>
                  {i + 1}. {s.title}
                </Text>
                <Text size="sm" c="dimmed">
                  {s.text}
                </Text>
              </div>
            </Group>
          ))}
        </Stack>
        <button className="cr-fight pulse" onClick={onClose}>
          {t("welcome.go")}
        </button>
      </Stack>
    </Modal>
  );
}

export function SpyModal({ opened, onClose, level }: { opened: boolean; onClose: () => void; level: Level }) {
  const { t } = useTranslation();
  return (
    <Modal opened={opened} onClose={onClose} centered size="lg" title={<Text fw={700} size="lg">{t("spy.title")}</Text>}>
      <Text size="sm" c="dimmed" mb="sm">
        {t("spy.intro")}
      </Text>
      <pre className="cr-snippet" style={{ maxHeight: "55vh", overflow: "auto", fontSize: 13 }}>
        {level.redStrategy.code}
      </pre>
      <Group justify="flex-end" mt="md">
        <Button onClick={onClose}>{t("spy.close")}</Button>
      </Group>
    </Modal>
  );
}
