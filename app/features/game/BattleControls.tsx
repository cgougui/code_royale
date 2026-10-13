import {
  ActionIcon,
  Button,
  Group,
  SegmentedControl,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconBug,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconRefresh,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { Level } from "@code-royale/content";
import type { SpawnSpec, Team, UnitType } from "@code-royale/engine";
import type { BattleReplay } from "~/domain/battle-replay";
import { UnitIcon } from "~/components/Icons";
import { useContent } from "~/i18n";
import type { DebugBlocked } from "./use-game-controller";

interface Props {
  level: Level;
  run: BattleReplay | null;
  debugging: boolean;
  battling: boolean;
  paused: boolean;
  speed: number;
  fog: boolean;
  debugBlocked: DebugBlocked | null;
  onTogglePause(): void;
  onSpeedChange(speed: number): void;
  onSkip(): void;
  onReplay(): void;
  onDebug(): void;
  onCloseDebugger(): void;
  onFogChange(fog: boolean): void;
}

export function BattleControls({
  level,
  run,
  debugging,
  battling,
  paused,
  speed,
  fog,
  debugBlocked,
  onTogglePause,
  onSpeedChange,
  onSkip,
  onReplay,
  onDebug,
  onCloseDebugger,
  onFogChange,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="cr-panel cr-battlebar">
      {debugging ? (
        <>
          <IconBug size={18} color="#fbbf24" />
          <Text size="sm" style={{ flex: 1 }}>
            <Trans i18nKey="battle.onHold" components={{ b: <b /> }} />
          </Text>
          <Button
            size="xs"
            variant="light"
            color="gray"
            onClick={onCloseDebugger}
          >
            {t("battle.backToBattle")}
          </Button>
        </>
      ) : battling ? (
        <>
          <Tooltip
            label={paused ? t("battle.play") : t("battle.pause")}
            withArrow
          >
            <ActionIcon
              variant="light"
              size="lg"
              onClick={() => onTogglePause()}
              aria-label={paused ? t("battle.play") : t("battle.pause")}
            >
              {paused ? (
                <IconPlayerPlay size={18} />
              ) : (
                <IconPlayerPause size={18} />
              )}
            </ActionIcon>
          </Tooltip>
          <SegmentedControl
            size="xs"
            value={String(speed)}
            onChange={(v) => onSpeedChange(Number(v))}
            data={[
              { label: "1×", value: "1" },
              { label: "2×", value: "2" },
              { label: "4×", value: "4" },
            ]}
          />
          <Tooltip label={t("battle.skip")} withArrow>
            <ActionIcon
              variant="light"
              size="lg"
              onClick={onSkip}
              disabled={!run?.done}
              aria-label={t("battle.skipLabel")}
            >
              <IconPlayerSkipForward size={18} />
            </ActionIcon>
          </Tooltip>
          <DebugButton blocked={debugBlocked} onClick={onDebug} />
          <span style={{ flex: 1 }} />
          <Text size="sm" c="dimmed" visibleFrom="lg">
            {t("battle.hoverHint")}
          </Text>
        </>
      ) : (
        <Roster blue={level.blue} red={level.red} />
      )}
      <Tooltip
        multiline
        w={260}
        withArrow
        label={t("battle.fogTooltip")}
      >
        <Switch
          checked={fog}
          onChange={(e) => onFogChange(e.currentTarget.checked)}
          label={t("battle.fog")}
          size="sm"
        />
      </Tooltip>
      {!battling && !debugging && run && (
        <DebugButton blocked={debugBlocked} onClick={onDebug} />
      )}
      {!battling && !debugging && run && (
        <Tooltip label={t("battle.replay")} withArrow>
          <ActionIcon
            variant="light"
            size="lg"
            onClick={onReplay}
            aria-label={t("battle.replayLabel")}
          >
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      )}
    </div>
  );
}

function DebugButton({
  blocked,
  onClick,
}: {
  blocked: DebugBlocked | null;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Tooltip
      label={
        blocked ? t(`debugBlocked.${blocked}`) : t("battle.debugTooltip")
      }
      withArrow
      multiline
      w={240}
    >
      <Button
        size="xs"
        variant="light"
        color="yellow"
        leftSection={<IconBug size={16} />}
        onClick={onClick}
        disabled={!!blocked}
      >
        {t("battle.debug")}
      </Button>
    </Tooltip>
  );
}

function countTypes(specs: SpawnSpec[]) {
  const m = new Map<UnitType, number>();
  for (const s of specs) m.set(s.type, (m.get(s.type) ?? 0) + 1);
  return [...m.entries()];
}

function Roster({ blue, red }: { blue: SpawnSpec[]; red: SpawnSpec[] }) {
  const { t } = useTranslation();
  const { units } = useContent();
  const groups = useMemo(
    () => [
      { team: "blue" as Team, units: countTypes(blue) },
      { team: "red" as Team, units: countTypes(red) },
    ],
    [blue, red],
  );
  return (
    <div className="cr-roster" style={{ flex: 1 }}>
      {groups.map((g) => (
        <Group key={g.team} gap={4} wrap="nowrap">
          <Text
            size="xs"
            fw={700}
            c={g.team === "blue" ? "blue.3" : "red.3"}
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {g.team === "blue" ? t("battle.you") : t("battle.red")}
          </Text>
          {g.units.map(([type, n]) => (
            <Tooltip
              key={type}
              multiline
              w={240}
              withArrow
              label={
                <span>
                  <b>{units[type].name}</b>: {units[type].description}
                  <br />⭐ {units[type].special.name}:{" "}
                  {units[type].special.description}
                </span>
              }
            >
              <Group
                gap={4}
                wrap="nowrap"
                px={6}
                style={{
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <UnitIcon type={type} team={g.team} size={38} />
                <div style={{ lineHeight: 1.1 }}>
                  <Text size="sm" fw={700}>
                    {t("battle.count", { count: n, name: units[type].name })}
                  </Text>
                  <Text size="xs" c="dimmed" ff="monospace">
                    "{type}"
                  </Text>
                </div>
              </Group>
            </Tooltip>
          ))}
        </Group>
      ))}
    </div>
  );
}
