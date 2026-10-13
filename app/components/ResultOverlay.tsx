import { Button, Group, Stack, Text } from "@mantine/core";
import { IconArrowRight, IconCode, IconEye, IconRefresh } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import type { Level } from "@code-royale/content";
import type { BattleResult } from "@code-royale/engine";
import { sfx } from "@code-royale/renderer";
import { StarIcon } from "./Icons";

interface Props {
  level: Level;
  result: BattleResult;
  earned: boolean[];
  newRecord: boolean;
  hasNext: boolean;
  muted: boolean;
  onNext: () => void;
  onReplay: () => void;
  onClose: () => void;
  onSpy: () => void;
}

const WIN_LINES = ["Your code is unstoppable!", "The Blue Kingdom cheers for you!", "Brilliant commanding!", "Nothing can stop your army!", "Legendary code, Commander!"];
const LOSE_LINES = ["Every great coder loses sometimes. Change your code and try again!", "So close! What could your fighters do better?", "Tip: a small change can turn the battle around.", "The red team got lucky this time. Revenge?"];
const DRAW_LINES = ["Nobody won before the clock ran out. Can your army be faster?"];

export function ResultOverlay({ level, result, earned, newRecord, hasNext, muted, onNext, onReplay, onClose, onSpy }: Props) {
  const [shown, setShown] = useState(0);
  const won = result.winner === "blue";
  const count = earned.filter(Boolean).length;
  const line = useMemo(() => {
    const pool = level.endless ? (count ? WIN_LINES : LOSE_LINES) : won ? WIN_LINES : result.winner === "draw" ? DRAW_LINES : LOSE_LINES;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [won, result, level, count]);

  // Stars pop one at a time.
  useEffect(() => {
    setShown(0);
    const timers = earned.map((on, i) =>
      setTimeout(
        () => {
          setShown(i + 1);
          if (on && !muted) sfx.star(i);
        },
        450 + i * 380,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [earned, muted]);

  const title = level.endless ? `${result.wave} ${result.wave === 1 ? "WAVE" : "WAVES"}!` : won ? "VICTORY!" : result.winner === "draw" ? "TIME'S UP!" : "DEFEAT";
  const good = level.endless ? count > 0 : won;

  return (
    <div className="cr-overlay cr-result">
      <div className="cr-result-card">
        <div className={`cr-result-title ${good ? "win" : "lose"}`}>{title}</div>
        {newRecord && (
          <Text c="pink.3" fw={700}>
            🏆 New record!
          </Text>
        )}
        <div className="cr-stars">
          {earned.map((on, i) => (
            <StarIcon key={i} on={on && shown > i} className={`cr-star ${on && shown > i ? "on" : ""} ${i === 1 ? "mid" : ""}`} />
          ))}
        </div>
        <Stack gap={4} mb={12} px="md">
          {level.stars.map((s, i) => (
            <div key={i} className="cr-goal">
              <span>{earned[i] ? "✅" : "⬜"}</span>
              <Text size="sm" c={earned[i] ? "yellow.2" : "gray.5"}>
                {s.label}
              </Text>
            </div>
          ))}
        </Stack>
        <Group justify="center" gap="lg" mb={10}>
          <Stat label="time" value={`${Math.floor(result.time)}s`} />
          <Stat label="enemies down" value={`${result.redKilled}`} />
          <Stat label="fighters left" value={`${result.blueAlive}/${result.blueTotal}`} />
          <Stat label="damage" value={`${result.damageDealt}`} />
        </Group>
        <Text size="sm" c="gray.3" mb={14}>
          {line}
        </Text>
        <Group justify="center" gap={8}>
          {won && hasNext && !level.endless ? (
            <Button size="md" color="orange" rightSection={<IconArrowRight size={18} />} onClick={onNext} className="cr-next">
              Next level
            </Button>
          ) : (
            <Button size="md" color="orange" leftSection={<IconCode size={18} />} onClick={onClose}>
              {won ? "Improve my code" : "Fix my code"}
            </Button>
          )}
          <Button size="md" variant="light" leftSection={<IconRefresh size={18} />} onClick={onReplay}>
            Watch again
          </Button>
        </Group>
        <Group justify="center" gap={8} mt={8}>
          {won && hasNext && !level.endless && (
            <Button size="xs" variant="subtle" color="gray" leftSection={<IconCode size={14} />} onClick={onClose}>
              Stay & improve
            </Button>
          )}
          <Button size="xs" variant="subtle" color="red" leftSection={<IconEye size={14} />} onClick={onSpy}>
            Spy on Red's code
          </Button>
        </Group>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text fw={700} size="lg" lh={1}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </div>
  );
}
