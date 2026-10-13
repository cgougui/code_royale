import { Badge, Button, Drawer, Group, Stack, Table, Tabs, Text } from "@mantine/core";
import { API_GROUPS } from "@code-royale/content";
import { BUSH_DETECT, ITEM_INFO, SCOUT_BUSH_DETECT, UNIT_STATS, type UnitType } from "@code-royale/engine";
import { UnitIcon } from "./Icons";

interface Props {
  opened: boolean;
  onClose: () => void;
  onInsert: (code: string) => void;
}

const VISION_RULES = [
  { emoji: "⚖️", title: "A fair fight", text: "In most levels both teams have exactly the same army. The only difference is the CODE. The red team gets cleverer level after level, but it always has a weakness to find!" },
  { emoji: "🤺", title: "Fighting style", text: "Your fighters already know how to fight: once me.attack() gets them close, knights circle their target and lunge in to strike, while archers, scouts and mages keep their distance and side-step between shots. Each hit pushes the target back a little." },
  { emoji: "🎯", title: "Target rings", text: "A spinning ring under a fighter means someone is attacking it: a blue ring for your team, a red ring for theirs. ×3 means three fighters are ganging up on it!" },
  { emoji: "💭", title: "Decision icons", text: "Every time your code makes a fighter change what it does, a small icon pops up: ⚔️ attack, 🔍 explore, 👣 follow, 🌀 circle, 🌿 hide, 💨 escape, ✋ wait, 📍 move, 🔁 patrol. 💤 means it got no orders at all!" },
  { emoji: "👁", title: "Detection radius", text: "Each fighter spots enemies inside its detection radius (me.sight). Hover a fighter in the arena to see its circle. Scouts see the furthest!" },
  { emoji: "🤝", title: "Shared vision", text: "Your team shares what it sees. If ONE fighter spots an enemy, it shows up in everybody's enemies list. Enemies nobody sees are NOT in the list." },
  { emoji: "🌳", title: "Bushes", text: `Fighters in a bush are hidden: enemies only spot them from very close (${BUSH_DETECT}), except scouts (${SCOUT_BUSH_DETECT}). Use me.hide() to go hide in the nearest bush.` },
  { emoji: "💥", title: "Attacking makes noise", text: "When you attack, enemies can spot you from further away for a moment, and you're no longer hidden in your bush. Hit… then move!" },
  { emoji: "🪨", title: "Rocks", text: "Rocks block the way AND block sight. Nobody can see through a rock: hide behind one!" },
  { emoji: "❗", title: "Spotted!", text: "A yellow ! pops up when your team spots an enemy. A red ! and a 👁 above your fighter mean the ENEMY can see it (me.isSpotted is true). A ? shows where an enemy disappeared." },
  { emoji: "🌫️", title: "Fog of war", text: "The dark areas are what your team can't see. Switch the Fog off under the arena to watch like a spectator." },
];

const JS_BASICS: { title: string; text: string; code: string }[] = [
  { title: "Nothing there? null!", text: "When there's nothing to find, me.nearestEnemy() gives null. if (enemy) is true only when something was found.", code: "let enemy = me.nearestEnemy()\nif (enemy) {\n  me.attack(enemy)\n} else {\n  me.explore()\n}" },
  { title: "Remember something", text: "let makes a variable: a named box to keep a value in.", code: "let enemy = me.nearestEnemy()" },
  { title: "Make a choice", text: "if runs code only when something is true. else runs when it's not.", code: 'if (me.health < 50) {\n  me.say("Ouch!")\n} else {\n  me.attack(me.nearestEnemy())\n}' },
  { title: "Compare things", text: "<  smaller than,  >  bigger than,  ==  equal,  !=  not equal", code: 'if (me.type == "archer" && me.distanceTo(enemy) < 100) { ... }' },
  { title: "And / Or / Not", text: "&& means AND (both true), || means OR (one is enough), ! means NOT.", code: "if (enemy && !me.hasShield) { ... }" },
  { title: "Stop here", text: "return stops the code for this fighter right now.", code: "if (!enemy) return" },
  { title: "Search a list", text: "find gives the first match. filter gives all matches. length counts them.", code: 'let mages = enemies.filter(e => e.type == "mage")\nlog("Mages:", mages.length)' },
  { title: "Loop over a list", text: "for ... of looks at each thing in a list, one by one.", code: "for (let e of enemies) {\n  log(e.name, e.health)\n}" },
  { title: "Do some math", text: "+ - * / work like on a calculator. Math.abs, Math.min, Math.max can help too.", code: "let halfHealth = me.maxHealth / 2" },
];

export function GuideDrawer({ opened, onClose, onInsert }: Props) {
  return (
    <Drawer opened={opened} onClose={onClose} position="right" size="lg" title={<Text fw={700} size="xl">📖 Commander's Guide</Text>}>
      <Tabs defaultValue="commands" keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="commands">🗡️ Commands</Tabs.Tab>
          <Tabs.Tab value="fighters">🛡️ Fighters</Tabs.Tab>
          <Tabs.Tab value="vision">📜 Rules</Tabs.Tab>
          <Tabs.Tab value="js">🧩 JavaScript</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="commands">
          <Text size="sm" c="dimmed" mb="md">
            Your code runs for <b>each</b> of your fighters, 20 times every second. <code>me</code> is the fighter running the code right now.
          </Text>
          <Stack gap="lg">
            {API_GROUPS.map((g) => (
              <div key={g.title}>
                <Text fw={700} size="lg" mb={2}>
                  {g.emoji} {g.title}
                </Text>
                <Text size="sm" c="dimmed" mb={8}>
                  {g.intro}
                </Text>
                <Stack gap={6}>
                  {g.items.map((it) => (
                    <div key={it.usage} className="cr-doc-item">
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
                            Insert
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
              const redOnly = type === "goblin" || type === "ogre";
              return (
                <div key={type} className="cr-doc-item">
                  <Group gap="sm" wrap="nowrap" align="flex-start">
                    <UnitIcon type={type} team={redOnly ? "red" : "blue"} size={52} />
                    <div style={{ flex: 1 }}>
                      <Group gap={6}>
                        <Text fw={700}>{s.label}</Text>
                        <code className="cr-doc-usage">"{type}"</code>
                        {redOnly && (
                          <Badge size="xs" color="red" variant="light">
                            red team only
                          </Badge>
                        )}
                      </Group>
                      <Text size="sm" c="dimmed">
                        {s.description}
                      </Text>
                      <Text size="sm" mt={4}>
                        ⭐ <b>{s.special.name}:</b> {s.special.description} <Text span c="dimmed">({s.special.cooldown}s to recharge)</Text>
                      </Text>
                    </div>
                  </Group>
                  <Table mt={6} withRowBorders={false} verticalSpacing={2} fz="xs">
                    <Table.Tbody>
                      <Table.Tr>
                        <Table.Td>❤️ health {s.hp}</Table.Td>
                        <Table.Td>🗡️ damage {s.damage}</Table.Td>
                        <Table.Td>🎯 range {s.range}</Table.Td>
                        <Table.Td>👟 speed {s.speed}</Table.Td>
                        <Table.Td>👁 sight {s.sight}</Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </div>
              );
            })}
            <Text fw={700} size="lg" mt="sm">
              💎 Treasures
            </Text>
            {Object.entries(ITEM_INFO).map(([kind, info]) => (
              <Text size="sm" key={kind}>
                <code className="cr-doc-usage">"{kind}"</code> <b>{info.label}</b>: {info.description}
              </Text>
            ))}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="vision">
          <Stack gap="sm">
            {VISION_RULES.map((r) => (
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
            {JS_BASICS.map((b) => (
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
