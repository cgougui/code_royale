import { Badge, Button, Drawer, Group, Stack, Table, Tabs, Text } from "@mantine/core";
import { Trans, useTranslation } from "react-i18next";
import { BUSH_DETECT, SCOUT_BUSH_DETECT, UNIT_STATS, type ItemKind, type UnitType } from "@code-royale/engine";
import { useContent } from "~/i18n";
import { UnitIcon } from "./Icons";

interface Props {
  opened: boolean;
  onClose: () => void;
  onInsert: (code: string) => void;
}

export function GuideDrawer({ opened, onClose, onInsert }: Props) {
  const { t } = useTranslation();
  const { api, units, items } = useContent();
  const rules = t("guide.rules", { returnObjects: true, bushDetect: BUSH_DETECT, scoutBushDetect: SCOUT_BUSH_DETECT });
  const basics = t("guide.js", { returnObjects: true });
  return (
    <Drawer opened={opened} onClose={onClose} position="right" size="lg" title={<Text fw={700} size="xl">{t("guide.title")}</Text>}>
      <Tabs defaultValue="commands" keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="commands">{t("guide.tabs.commands")}</Tabs.Tab>
          <Tabs.Tab value="fighters">{t("guide.tabs.fighters")}</Tabs.Tab>
          <Tabs.Tab value="vision">{t("guide.tabs.rules")}</Tabs.Tab>
          <Tabs.Tab value="js">{t("guide.tabs.js")}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="commands">
          <Text size="sm" c="dimmed" mb="md">
            <Trans i18nKey="guide.commandsIntro" components={{ b: <b />, code: <code /> }} />
          </Text>
          <Stack gap="lg">
            {api.map((g) => (
              <div key={g.id}>
                <Text fw={700} size="lg" mb={2}>
                  {g.emoji} {g.title}
                </Text>
                <Text size="sm" c="dimmed" mb={8}>
                  {g.intro}
                </Text>
                <Stack gap={6}>
                  {g.items.map((it) => (
                    <div key={it.name} className="cr-doc-item">
                      <code className="cr-doc-usage">{it.usage}</code>
                      <Text size="sm" mt={2}>
                        {it.description}
                      </Text>
                      {it.example && (
                        <Group gap={6} mt={4} wrap="nowrap">
                          <pre className="cr-snippet" style={{ flex: 1, margin: 0 }}>
                            {it.example}
                          </pre>
                          <Button size="compact-xs" variant="light" onClick={() => onInsert(it.example!)}>
                            {t("guide.insert")}
                          </Button>
                        </Group>
                      )}
                    </div>
                  ))}
                </Stack>
              </div>
            ))}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="fighters">
          <Stack gap="sm">
            {(Object.keys(UNIT_STATS) as UnitType[]).map((type) => {
              const s = UNIT_STATS[type];
              const text = units[type];
              const redOnly = type === "goblin" || type === "ogre";
              return (
                <div key={type} className="cr-doc-item">
                  <Group gap="sm" wrap="nowrap" align="flex-start">
                    <UnitIcon type={type} team={redOnly ? "red" : "blue"} size={52} />
                    <div style={{ flex: 1 }}>
                      <Group gap={6}>
                        <Text fw={700}>{text.name}</Text>
                        <code className="cr-doc-usage">"{type}"</code>
                        {redOnly && (
                          <Badge size="xs" color="red" variant="light">
                            {t("guide.redOnly")}
                          </Badge>
                        )}
                      </Group>
                      <Text size="sm" c="dimmed">
                        {text.description}
                      </Text>
                      <Text size="sm" mt={4}>
                        ⭐ <b>{text.special.name}:</b> {text.special.description}{" "}
                        <Text span c="dimmed">
                          {t("guide.recharge", { count: s.special.cooldown })}
                        </Text>
                      </Text>
                    </div>
                  </Group>
                  <Table mt={6} withRowBorders={false} verticalSpacing={2} fz="xs">
                    <Table.Tbody>
                      <Table.Tr>
                        <Table.Td>{t("guide.stats.health", { value: s.hp })}</Table.Td>
                        <Table.Td>{t("guide.stats.damage", { value: s.damage })}</Table.Td>
                        <Table.Td>{t("guide.stats.range", { value: s.range })}</Table.Td>
                        <Table.Td>{t("guide.stats.speed", { value: s.speed })}</Table.Td>
                        <Table.Td>{t("guide.stats.sight", { value: s.sight })}</Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </div>
              );
            })}
            <Text fw={700} size="lg" mt="sm">
              {t("guide.treasures")}
            </Text>
            {(Object.keys(items) as ItemKind[]).map((kind) => (
              <Text size="sm" key={kind}>
                <code className="cr-doc-usage">"{kind}"</code> <b>{items[kind].name}</b>: {items[kind].description}
              </Text>
            ))}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="vision">
          <Stack gap="sm">
            {rules.map((r) => (
              <div key={r.title} className="cr-doc-item">
                <Text fw={700}>
                  {r.emoji} {r.title}
                </Text>
                <Text size="sm" c="dimmed">
                  {r.text}
                </Text>
              </div>
            ))}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="js">
          <Stack gap="sm">
            {basics.map((b) => (
              <div key={b.title} className="cr-doc-item">
                <Text fw={700}>{b.title}</Text>
                <Text size="sm" c="dimmed" mb={4}>
                  {b.text}
                </Text>
                <pre className="cr-snippet">{b.code}</pre>
              </div>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Drawer>
  );
}
