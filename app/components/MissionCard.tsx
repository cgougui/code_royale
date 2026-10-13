import { ActionIcon, Badge, Button, Collapse, Group, Modal, Stack, Text, Tooltip } from "@mantine/core";
import { IconBulb, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import type { Level } from "@code-royale/content";
import { StarIcon } from "./Icons";

interface Props {
  level: Level;
  stars: number;
  bestWave?: number;
  onInsert: (code: string) => void;
}

export function levelColor(level: Level) {
  return `var(--mantine-color-${level.color}-6)`;
}

export function MissionCard({ level, stars, bestWave, onInsert }: Props) {
  const [open, setOpen] = useState(true);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [revealed, setRevealed] = useState(1);

  useEffect(() => {
    setOpen(true);
    setRevealed(1);
  }, [level.id]);

  return (
    <div className="cr-panel cr-mission">
      <Group gap="sm" wrap="nowrap" style={{ cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        <div className="cr-level-num" style={{ background: levelColor(level) }}>
          {level.num}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} size="lg" lh={1.1} truncate>
            {level.title}
          </Text>
          <Text size="sm" c="dimmed" truncate>
            {level.tagline}
          </Text>
        </div>
        <Group gap={2}>
          {[0, 1, 2].map((i) => (
            <StarIcon key={i} on={i < stars} size={22} />
          ))}
        </Group>
        <ActionIcon variant="subtle" color="gray" aria-label={open ? "Hide mission" : "Show mission"}>
          {open ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
        </ActionIcon>
      </Group>

      <Collapse expanded={open}>
        <Stack gap={8} mt={10}>
          <Text size="sm" lh={1.45}>
            {level.story}
          </Text>
          <Text size="sm" lh={1.45} c="violet.2">
            🧠 <b>Learn:</b> {level.learn}
          </Text>
          {level.newApi.length > 0 && (
            <Group gap={6}>
              <Text size="xs" c="dimmed">
                New:
              </Text>
              {level.newApi.map((api) => (
                <code key={api} className="cr-doc-usage" style={{ fontSize: 12 }}>
                  {api}
                </code>
              ))}
            </Group>
          )}
          <Group gap={6} align="flex-start">
            <Stack gap={3} style={{ flex: 1 }}>
              {level.stars.map((s, i) => (
                <Group key={i} gap={6} wrap="nowrap">
                  <StarIcon on={i < stars} size={16} />
                  <Text size="sm" c={i < stars ? "yellow.2" : "gray.4"}>
                    {s.label}
                  </Text>
                </Group>
              ))}
              {bestWave !== undefined && bestWave > 0 && (
                <Text size="sm" c="pink.3">
                  🏆 Your record: {bestWave} waves
                </Text>
              )}
            </Stack>
            <Tooltip label="Stuck? Get a hint!" withArrow>
              <Button
                size="xs"
                variant="light"
                color="yellow"
                leftSection={<IconBulb size={16} />}
                onClick={(e) => {
                  e.stopPropagation();
                  setHintsOpen(true);
                }}
              >
                Hints
              </Button>
            </Tooltip>
          </Group>
        </Stack>
      </Collapse>

      <Modal opened={hintsOpen} onClose={() => setHintsOpen(false)} title={<Text fw={700} size="lg">💡 Hints for “{level.title}”</Text>} size="lg" centered>
        <Stack gap="md">
          {level.hints.slice(0, revealed).map((h, i) => (
            <div key={i} className="cr-panel" style={{ padding: 14 }}>
              <Group justify="space-between" mb={6}>
                <Text fw={700}>
                  <Badge mr={8} color="yellow" variant="light">
                    Hint {i + 1}
                  </Badge>
                  {h.title}
                </Text>
              </Group>
              <Text size="sm" mb={h.code ? 8 : 0}>
                {h.text}
              </Text>
              {h.code && (
                <>
                  <pre className="cr-snippet">{h.code}</pre>
                  <Button
                    size="xs"
                    mt={8}
                    variant="light"
                    onClick={() => {
                      onInsert(h.code!);
                      setHintsOpen(false);
                    }}
                  >
                    ✨ Put this in my code
                  </Button>
                </>
              )}
            </div>
          ))}
          {revealed < level.hints.length ? (
            <Button variant="subtle" color="yellow" onClick={() => setRevealed((r) => r + 1)}>
              Show another hint ({level.hints.length - revealed} left)
            </Button>
          ) : (
            <Text size="sm" c="dimmed" ta="center">
              That's all the hints! You've got this, Commander. 💪
            </Text>
          )}
        </Stack>
      </Modal>
    </div>
  );
}
