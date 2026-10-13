import { Button, Group, Stack, Text } from "@mantine/core";
import { IconArrowRight, IconCode, IconEye, IconRefresh } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

export function ResultOverlay({ level, result, earned, newRecord, hasNext, muted, onNext, onReplay, onClose, onSpy }: Props) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(0);
  const won = result.winner === "blue";
  const count = earned.filter(Boolean).length;
  const pool = level.endless ? (count ? "winLines" : "loseLines") : won ? "winLines" : result.winner === "draw" ? "drawLines" : "loseLines";
  // Pick once per result, so the line stays put (even if the language changes).
  const pick = useMemo(() => Math.random(), [result]);
  const lines = t(`result.${pool}`, { returnObjects: true });
  const line = lines[Math.floor(pick * lines.length)];

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

  const title = level.endless ? t("result.waves", { count: result.wave }) : won ? t("result.victory") : result.winner === "draw" ? t("result.timeUp") : t("result.defeat");
  const good = level.endless ? count > 0 : won;

  return (
    <div className="cr-overlay cr-result">
      <div className="cr-result-card">
        <div className={`cr-result-title ${good ? "win" : "lose"}`}>{title}</div>
        {newRecord && (
          <Text c="pink.3" fw={700}>
            {t("result.newRecord")}
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
          <Stat label={t("result.time")} value={t("result.seconds", { count: Math.floor(result.time) })} />
          <Stat label={t("result.enemiesDown")} value={`${result.redKilled}`} />
          <Stat label={t("result.fightersLeft")} value={`${result.blueAlive}/${result.blueTotal}`} />
          <Stat label={t("result.damage")} value={`${result.damageDealt}`} />
        </Group>
        <Text size="sm" c="gray.3" mb={14}>
          {line}
        </Text>
        <Group justify="center" gap={8}>
          {won && hasNext && !level.endless ? (
            <Button size="md" color="orange" rightSection={<IconArrowRight size={18} />} onClick={onNext} className="cr-next">
              {t("result.nextLevel")}
            </Button>
          ) : (
            <Button size="md" color="orange" leftSection={<IconCode size={18} />} onClick={onClose}>
              {won ? t("result.improve") : t("result.fix")}
            </Button>
          )}
          <Button size="md" variant="light" leftSection={<IconRefresh size={18} />} onClick={onReplay}>
            {t("result.watchAgain")}
          </Button>
        </Group>
        <Group justify="center" gap={8} mt={8}>
          {won && hasNext && !level.endless && (
            <Button size="xs" variant="subtle" color="gray" leftSection={<IconCode size={14} />} onClick={onClose}>
              {t("result.stay")}
            </Button>
          )}
          <Button size="xs" variant="subtle" color="red" leftSection={<IconEye size={14} />} onClick={onSpy}>
            {t("result.spy")}
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
