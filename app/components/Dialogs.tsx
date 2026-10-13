import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import type { Level } from "@code-royale/content";
import { CrownLogo } from "./Icons";

export function WelcomeModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const steps = [
    { icon: "✏️", title: "Write code", text: "Your code gives orders to the BLUE army. Every fighter runs it many times per second." },
    { icon: "⚔️", title: "Press FIGHT!", text: "Watch your army battle the RED team. Did your plan work?" },
    { icon: "⭐", title: "Earn stars", text: "Win to unlock new levels, new fighters and new tricks. Can you get all the stars?" },
  ];
  return (
    <Modal opened={opened} onClose={onClose} centered size="lg" withCloseButton={false} radius="lg">
      <Stack align="center" gap="md" p="md">
        <CrownLogo size={84} />
        <Text fw={700} fz={34} ta="center" lh={1.1}>
          Welcome to Code Royale!
        </Text>
        <Text c="dimmed" ta="center">
          You are the Commander of the Blue Kingdom. But your fighters only listen to… <b>code</b>!
        </Text>
        <Stack gap="sm" w="100%">
          {steps.map((s, i) => (
            <Group key={s.title} gap="md" wrap="nowrap" className="cr-panel" p="sm">
              <Text fz={34}>{s.icon}</Text>
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
          Let's go, Commander! ⚔️
        </button>
      </Stack>
    </Modal>
  );
}

export function SpyModal({ opened, onClose, level }: { opened: boolean; onClose: () => void; level: Level }) {
  return (
    <Modal opened={opened} onClose={onClose} centered size="lg" title={<Text fw={700} size="lg">🕵️ Red team's secret code</Text>}>
      <Text size="sm" c="dimmed" mb="sm">
        You sneaked into the red camp and found their battle plan! Every red fighter runs this code. Can you find a weakness?
      </Text>
      <pre className="cr-snippet" style={{ maxHeight: "55vh", overflow: "auto", fontSize: 13 }}>
        {level.redStrategy.code}
      </pre>
      <Group justify="flex-end" mt="md">
        <Button onClick={onClose}>Got it!</Button>
      </Group>
    </Modal>
  );
}
