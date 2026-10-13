import { Group, Modal, SimpleGrid, Text } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { LEVELS } from "~/game/levels";
import { isUnlocked, totalStars, type Progress } from "~/game/progress";
import { StarIcon } from "./Icons";
import { levelColor } from "./MissionCard";

interface Props {
  opened: boolean;
  onClose: () => void;
  progress: Progress;
  current: string;
  onPick: (id: string) => void;
}

export function LevelMap({ opened, onClose, progress, current, onPick }: Props) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      centered
      title={
        <Group gap="sm">
          <Text fw={700} size="xl">
            🗺️ The Kingdom Map
          </Text>
          <Text c="yellow.3" fw={600}>
            ⭐ {totalStars(progress)} / {LEVELS.length * 3}
          </Text>
        </Group>
      }
    >
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
        {LEVELS.map((l) => {
          const unlocked = isUnlocked(progress, l.id);
          const stars = progress.stars[l.id] ?? 0;
          return (
            <div
              key={l.id}
              className={`cr-level-card ${unlocked ? "" : "locked"} ${current === l.id ? "current" : ""}`}
              onClick={() => unlocked && onPick(l.id)}
              role="button"
              aria-disabled={!unlocked}
            >
              <Group justify="space-between" mb={8} wrap="nowrap">
                <div className="cr-level-num" style={{ background: levelColor(l) }}>
                  {unlocked ? l.num : <IconLock size={18} />}
                </div>
                <Group gap={2}>
                  {[0, 1, 2].map((i) => (
                    <StarIcon key={i} on={i < stars} size={20} />
                  ))}
                </Group>
              </Group>
              <Text fw={700} size="lg" lh={1.15}>
                {l.title}
              </Text>
              <Text size="sm" c="dimmed">
                {unlocked ? l.tagline : `Win “${LEVELS[l.num - 2]?.title}” to unlock`}
              </Text>
              {l.endless && progress.bestWave > 0 && (
                <Text size="xs" c="pink.3" mt={4}>
                  🏆 Record: {progress.bestWave} waves
                </Text>
              )}
            </div>
          );
        })}
      </SimpleGrid>
    </Modal>
  );
}
