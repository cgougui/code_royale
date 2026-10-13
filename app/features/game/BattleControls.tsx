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
import type { Level } from "@code-royale/content";
import {
  UNIT_STATS,
  type SpawnSpec,
  type Team,
  type UnitType,
} from "@code-royale/engine";
import type { BattleReplay } from "~/domain/battle-replay";
import { UnitIcon } from "~/components/Icons";

interface Props {
  level: Level;
  run: BattleReplay | null;
  debugging: boolean;
  battling: boolean;
  paused: boolean;
  speed: number;
  fog: boolean;
  debugBlocked: string | null;
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
  return (
    <div className="cr-panel cr-battlebar">
      {debugging ? (
        <>
          <IconBug size={18} color="#fbbf24" />
          <Text size="sm" style={{ flex: 1 }}>
            Battle on hold. <b>Click a blue fighter</b> to debug its code.
          </Text>
          <Button
            size="xs"
            variant="light"
            color="gray"
            onClick={onCloseDebugger}
          >
            Back to the battle
          </Button>
        </>
      ) : battling ? (
        <>
          <Tooltip label={paused ? "Play" : "Pause"} withArrow>
            <ActionIcon
              variant="light"
              size="lg"
              onClick={() => onTogglePause()}
              aria-label="Pause"
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
          <Tooltip label="Skip to the end" withArrow>
            <ActionIcon
              variant="light"
              size="lg"
              onClick={onSkip}
              disabled={!run?.done}
              aria-label="Skip"
            >
              <IconPlayerSkipForward size={18} />
            </ActionIcon>
          </Tooltip>
          <DebugButton blocked={debugBlocked} onClick={onDebug} />
          <span style={{ flex: 1 }} />
          <Text size="sm" c="dimmed" visibleFrom="lg">
            Hover a fighter to see what it can see
          </Text>
        </>
      ) : (
        <Roster blue={level.blue} red={level.red} />
      )}
      <Tooltip
        multiline
        w={260}
        withArrow
        label="ON: you only see what your fighters can see, like a real commander. OFF: spectator mode, see everything (even enemies hiding in bushes)."
      >
        <Switch
          checked={fog}
          onChange={(e) => onFogChange(e.currentTarget.checked)}
          label="🌫️ Fog"
          size="sm"
        />
      </Tooltip>
      {!battling && !debugging && run && (
        <DebugButton blocked={debugBlocked} onClick={onDebug} />
      )}
      {!battling && !debugging && run && (
        <Tooltip label="Watch the last battle again" withArrow>
          <ActionIcon
            variant="light"
            size="lg"
            onClick={onReplay}
            aria-label="Replay"
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
  blocked: string | null;
  onClick: () => void;
}) {
  return (
    <Tooltip
      label={
        blocked ??
        "Pause and run your code step by step, to see what your fighters think (and why!)"
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
        Debug
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
            {g.team === "blue" ? "YOU" : "RED"}
          </Text>
          {g.units.map(([type, n]) => (
            <Tooltip
              key={type}
              multiline
              w={240}
              withArrow
              label={
                <span>
                  <b>{UNIT_STATS[type].label}</b>:{" "}
                  {UNIT_STATS[type].description}
                  <br />⭐ {UNIT_STATS[type].special.name}:{" "}
                  {UNIT_STATS[type].special.description}
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
                    {n}× {UNIT_STATS[type].label}
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
