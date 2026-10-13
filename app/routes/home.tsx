import { ActionIcon, Badge, Button, Group, Menu, SegmentedControl, Text, Tooltip } from "@mantine/core";
import {
  IconBook2,
  IconChevronDown,
  IconDotsVertical,
  IconMap2,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconRefresh,
  IconRestore,
  IconVolume,
  IconVolumeOff,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arena } from "~/components/Arena";
import { CodeEditor, type CodeEditorHandle } from "~/components/CodeEditor";
import { ConsolePanel } from "~/components/ConsolePanel";
import { SpyModal, WelcomeModal } from "~/components/Dialogs";
import { GuideDrawer } from "~/components/GuideDrawer";
import { CrownLogo, StarIcon, UnitIcon } from "~/components/Icons";
import { LevelMap } from "~/components/LevelMap";
import { levelColor, MissionCard } from "~/components/MissionCard";
import { ResultOverlay } from "~/components/ResultOverlay";
import { sfx } from "~/game/audio";
import { UNIT_STATS } from "~/game/constants";
import { LEVELS, levelById, STARTER_CODE, starsFor } from "~/game/levels";
import { codeFor, defaultProgress, loadProgress, saveProgress, totalStars, type Progress } from "~/game/progress";
import { BattleRun, type RunError } from "~/game/runner";
import type { BattleResult, LogEntry, SpawnSpec, Team, UnitType } from "~/game/types";

export default function Home() {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [loaded, setLoaded] = useState(false);
  const [levelId, setLevelId] = useState(LEVELS[0].id);
  const level = levelById(levelId);
  const [code, setCode] = useState(STARTER_CODE);

  const [run, setRun] = useState<BattleRun | null>(null);
  const [starting, setStarting] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [skipKey, setSkipKey] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [visibleTick, setVisibleTick] = useState(0);
  const [runError, setRunError] = useState<RunError | null>(null);
  const [lineError, setLineError] = useState<{ line?: number; message: string } | null>(null);
  const [result, setResult] = useState<{ res: BattleResult; earned: boolean[]; newRecord: boolean } | null>(null);

  const [mapOpen, setMapOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [spyOpen, setSpyOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  const editor = useRef<CodeEditorHandle>(null);
  const pending = useRef<BattleRun | null>(null);

  // Load saved progress (browser only).
  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    setLevelId(p.current);
    setCode(codeFor(p, p.current));
    setWelcomeOpen(!p.seenIntro);
    sfx.muted = p.muted;
    setLoaded(true);
  }, []);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((prev) => {
      const next = fn(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  // Save code as the player types.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => update((p) => ({ ...p, code: { ...p.code, [levelId]: code }, lastCode: code })), 300);
    return () => clearTimeout(t);
  }, [code, levelId, loaded, update]);

  const stopBattle = useCallback(() => {
    pending.current?.stop();
    pending.current = null;
    run?.stop();
    setRun(null);
    setStarting(false);
    setResult(null);
    setPaused(false);
  }, [run]);

  const startBattle = useCallback(() => {
    sfx.unlock();
    stopBattle();
    setLogs([]);
    setVisibleTick(0);
    setRunError(null);
    setLineError(null);
    setReplayKey(0);
    setSkipKey(0);
    setStarting(true);
    const r = new BattleRun(levelId, code, Math.floor(Math.random() * 1e9), {
      onInit: () => {
        if (pending.current !== r) return;
        setStarting(false);
        setRun(r);
      },
      onLogs: (entries) => {
        if (pending.current !== r) return;
        setLogs((prev) => [...prev, ...entries]);
        const err = entries.find((e) => e.kind === "error");
        if (err) {
          setLineError((cur) => cur ?? { line: err.line, message: err.text });
          setRunError((cur) => cur ?? { kind: "runtime", line: err.line, message: `${err.unit ? `${err.unit} says: ` : ""}${err.text}` });
        }
      },
      onError: (err) => {
        if (pending.current !== r) return;
        setStarting(false);
        setRunError(err);
        setRun(null);
        setLogs((prev) => [...prev, { tick: -1, kind: "error", text: err.message, line: err.line }]);
        if (err.line) setLineError({ line: err.line, message: err.message });
      },
    });
    pending.current = r;
  }, [code, levelId, stopBattle]);

  const onFinished = useCallback(
    (res: BattleResult) => {
      const earned = starsFor(level, res);
      const count = earned.filter(Boolean).length;
      const newRecord = !!level.endless && res.wave > progress.bestWave && progress.bestWave > 0;
      update((p) => {
        return {
          ...p,
          battles: p.battles + 1,
          stars: { ...p.stars, [level.id]: Math.max(p.stars[level.id] ?? 0, count) },
          bestWave: level.endless ? Math.max(p.bestWave, res.wave) : p.bestWave,
        };
      });
      setResult({ res, earned, newRecord });
    },
    [level, progress.bestWave, update],
  );

  const pickLevel = useCallback(
    (id: string) => {
      stopBattle();
      setMapOpen(false);
      setLogs([]);
      setRunError(null);
      setLineError(null);
      setLevelId(id);
      setCode(codeFor(progress, id));
      update((p) => ({ ...p, current: id }));
    },
    [progress, stopBattle, update],
  );

  const levelIndex = LEVELS.findIndex((l) => l.id === levelId);
  const next = LEVELS[levelIndex + 1];
  const battling = !!run && !result;
  const muted = progress.muted;

  return (
    <div className="cr-app">
      <header className="cr-header">
        <div className="cr-logo">
          <CrownLogo />
          <span className="cr-logo-text">Code Royale</span>
        </div>
        <Button
          variant="light"
          color="gray"
          ml="md"
          leftSection={<IconMap2 size={18} />}
          rightSection={<IconChevronDown size={16} />}
          onClick={() => setMapOpen(true)}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Badge circle size="md" style={{ background: levelColor(level) }}>
              {level.num}
            </Badge>
            {level.title}
          </span>
        </Button>
        <span style={{ flex: 1 }} />
        <Tooltip label="Total stars" withArrow>
          <Group gap={4} wrap="nowrap">
            <StarIcon on size={22} />
            <Text fw={700} c="yellow.2" size="lg">
              {totalStars(progress)}
            </Text>
            <Text span c="dimmed" size="sm">
              / {LEVELS.length * 3}
            </Text>
          </Group>
        </Tooltip>
        <Button variant="light" leftSection={<IconBook2 size={18} />} onClick={() => setGuideOpen(true)}>
          Guide
        </Button>
        <Tooltip label={muted ? "Sound off" : "Sound on"} withArrow>
          <ActionIcon
            variant="light"
            color="gray"
            size="lg"
            aria-label="Toggle sound"
            onClick={() => {
              const m = !muted;
              sfx.muted = m;
              update((p) => ({ ...p, muted: m }));
            }}
          >
            {muted ? <IconVolumeOff size={18} /> : <IconVolume size={18} />}
          </ActionIcon>
        </Tooltip>
      </header>

      <main className="cr-main">
        <section className="cr-left">
          <MissionCard level={level} stars={progress.stars[level.id] ?? 0} bestWave={level.endless ? progress.bestWave : undefined} onInsert={(c) => editor.current?.insert(c)} />
          <div className="cr-panel cr-editor-wrap">
            <div className="cr-editor-toolbar">
              <Tooltip label="Ctrl + Enter" withArrow>
                <button className={`cr-fight ${!run && !starting && progress.battles < 3 ? "pulse" : ""}`} onClick={startBattle} disabled={starting}>
                  ⚔️ {run ? "FIGHT AGAIN" : "FIGHT!"}
                </button>
              </Tooltip>
              <Text size="sm" c="dimmed" style={{ flex: 1 }} truncate>
                ✏️ Code for <b>each</b> blue fighter
              </Text>
              <Menu position="bottom-end" withArrow>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray" size="lg" aria-label="More">
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconRestore size={16} />}
                    onClick={() => {
                      if (confirm("Replace your code with the starter code? Your current code will be lost.")) setCode(STARTER_CODE);
                    }}
                  >
                    Start over with the starter code
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </div>
            <CodeEditor ref={editor} value={code} onChange={setCode} onRun={startBattle} runtimeError={lineError} />
          </div>
          <ConsolePanel logs={logs} visibleTick={result ? Infinity : visibleTick} onClear={() => setLogs([])} onGoToLine={(l) => editor.current?.goToLine(l)} />
        </section>

        <section className="cr-right">
          <Arena
            level={level}
            run={run}
            replayKey={replayKey}
            skipKey={skipKey}
            speed={speed}
            paused={paused}
            muted={muted}
            onTick={setVisibleTick}
            onFinished={onFinished}
          >
            {result && (
              <ResultOverlay
                level={level}
                result={result.res}
                earned={result.earned}
                newRecord={result.newRecord}
                hasNext={!!next}
                muted={muted}
                onNext={() => next && pickLevel(next.id)}
                onReplay={() => {
                  setResult(null);
                  setReplayKey((k) => k + 1);
                }}
                onClose={() => {
                  setResult(null);
                  setRun(null);
                }}
                onSpy={() => setSpyOpen(true)}
              />
            )}
            {runError && (
              <div className="cr-error-toast cr-panel" style={{ padding: "12px 16px", borderColor: "rgba(248,113,113,0.6)" }}>
                <Text fw={700} c="red.3" mb={4}>
                  {runError.kind === "loop" ? "🌀 Your code got stuck!" : runError.kind === "runtime" ? "💥 Your fighters are confused!" : "💥 Oops! Your code has a problem"}
                  {runError.line ? ` (line ${runError.line})` : ""}
                </Text>
                <Text size="sm">{runError.message}</Text>
                <Group gap={8} mt={8}>
                  {runError.line && (
                    <Button size="xs" color="red" variant="light" onClick={() => editor.current?.goToLine(runError.line!)}>
                      Show me line {runError.line}
                    </Button>
                  )}
                  <Button size="xs" variant="subtle" color="gray" onClick={() => setRunError(null)}>
                    OK
                  </Button>
                </Group>
              </div>
            )}
          </Arena>

          <div className="cr-panel cr-battlebar">
            {battling ? (
              <>
                <Tooltip label={paused ? "Play" : "Pause"} withArrow>
                  <ActionIcon variant="light" size="lg" onClick={() => setPaused((p) => !p)} aria-label="Pause">
                    {paused ? <IconPlayerPlay size={18} /> : <IconPlayerPause size={18} />}
                  </ActionIcon>
                </Tooltip>
                <SegmentedControl
                  size="xs"
                  value={String(speed)}
                  onChange={(v) => setSpeed(Number(v))}
                  data={[
                    { label: "1×", value: "1" },
                    { label: "2×", value: "2" },
                    { label: "4×", value: "4" },
                  ]}
                />
                <Tooltip label="Skip to the end" withArrow>
                  <ActionIcon variant="light" size="lg" onClick={() => setSkipKey((k) => k + 1)} disabled={!run?.done} aria-label="Skip">
                    <IconPlayerSkipForward size={18} />
                  </ActionIcon>
                </Tooltip>
                <span style={{ flex: 1 }} />
                <Text size="sm" c="dimmed">
                  Hover a fighter to see its name & health
                </Text>
              </>
            ) : (
              <Roster blue={level.blue} red={level.red} />
            )}
            {!battling && run && (
              <Tooltip label="Watch the last battle again" withArrow>
                <ActionIcon
                  variant="light"
                  size="lg"
                  onClick={() => {
                    setResult(null);
                    setReplayKey((k) => k + 1);
                  }}
                  aria-label="Replay"
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </div>
        </section>
      </main>

      <LevelMap opened={mapOpen} onClose={() => setMapOpen(false)} progress={progress} current={levelId} onPick={pickLevel} />
      <GuideDrawer opened={guideOpen} onClose={() => setGuideOpen(false)} onInsert={(c) => editor.current?.insert(c)} />
      <SpyModal opened={spyOpen} onClose={() => setSpyOpen(false)} level={level} />
      <WelcomeModal
        opened={welcomeOpen}
        onClose={() => {
          sfx.unlock();
          setWelcomeOpen(false);
          update((p) => ({ ...p, seenIntro: true }));
        }}
      />
    </div>
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
          <Text size="xs" fw={700} c={g.team === "blue" ? "blue.3" : "red.3"} style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
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
                  <b>{UNIT_STATS[type].label}</b>: {UNIT_STATS[type].description}
                  <br />⭐ {UNIT_STATS[type].special.name}: {UNIT_STATS[type].special.description}
                </span>
              }
            >
              <Group gap={4} wrap="nowrap" px={6} style={{ borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
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
