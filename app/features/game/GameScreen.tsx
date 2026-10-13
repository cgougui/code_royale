import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Menu,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconBook2,
  IconBug,
  IconChevronDown,
  IconDotsVertical,
  IconMap2,
  IconRestore,
  IconVolume,
  IconVolumeOff,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import { Arena } from "~/components/Arena";
import { CodeEditor, type CodeEditorHandle } from "~/components/CodeEditor";
import { ConsolePanel } from "~/components/ConsolePanel";
import { DebugPanel } from "~/components/DebugPanel";
import { SpyModal, WelcomeModal } from "~/components/Dialogs";
import { GuideDrawer } from "~/components/GuideDrawer";
import { CrownLogo, StarIcon } from "~/components/Icons";
import { LevelMap } from "~/components/LevelMap";
import { levelColor, MissionCard } from "~/components/MissionCard";
import { ResultOverlay } from "~/components/ResultOverlay";
import { LEVELS, starter } from "@code-royale/content";
import { totalStars } from "~/domain/progress";
import { useGameController } from "./use-game-controller";
import { BattleControls } from "./BattleControls";

export function GameScreen() {
  const {
    player,
    battle,
    level,
    next,
    dbg,
    debugBlocked,
    debugInfo,
    firstError,
    inspect,
    openDebugger,
    setPreviewTick,
    setBreakpoints,
    startBattle,
    selectLevel,
    acknowledgeIntro,
  } = useGameController();
  const { progress, code, setCode } = player;
  const {
    run,
    starting,
    replayKey,
    skipKey,
    speed,
    setSpeed,
    paused,
    setPaused,
    logs,
    visibleTick,
    runError,
    lineError,
    result,
    onFinished,
    setVisibleTick,
  } = battle;
  const levelId = level.id;
  const debugging = !!dbg.state;
  const battling = !!run && !result;
  const muted = progress.muted;
  const welcomeOpen = player.loaded && !progress.seenIntro;
  const [fog, setFog] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [spyOpen, setSpyOpen] = useState(false);
  const editor = useRef<CodeEditorHandle>(null);
  const pickLevel = (id: string) => {
    selectLevel(id);
    setMapOpen(false);
  };

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
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
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
        <Button
          variant="light"
          leftSection={<IconBook2 size={18} />}
          onClick={() => setGuideOpen(true)}
        >
          Guide
        </Button>
        <Tooltip label={muted ? "Sound off" : "Sound on"} withArrow>
          <ActionIcon
            variant="light"
            color="gray"
            size="lg"
            aria-label="Toggle sound"
            onClick={player.toggleMute}
          >
            {muted ? <IconVolumeOff size={18} /> : <IconVolume size={18} />}
          </ActionIcon>
        </Tooltip>
      </header>

      <main className="cr-main">
        <section className="cr-left">
          {!debugging && (
            <MissionCard
              level={level}
              stars={progress.stars[level.id] ?? 0}
              bestWave={level.endless ? progress.bestWave : undefined}
              onInsert={(c) => editor.current?.insert(c)}
            />
          )}
          <div className="cr-panel cr-editor-wrap">
            <div className="cr-editor-toolbar">
              <Tooltip label="Ctrl + Enter" withArrow>
                <button
                  className={`cr-fight ${!run && !starting && progress.battles < 3 ? "pulse" : ""}`}
                  onClick={startBattle}
                  disabled={starting}
                >
                  ⚔️ {run ? "FIGHT AGAIN" : "FIGHT!"}
                </button>
              </Tooltip>
              <Text size="sm" c="dimmed" style={{ flex: 1 }} truncate>
                {debugging ? (
                  <>🔒 Your code is locked while you debug</>
                ) : (
                  <>
                    ✏️ Code for <b>each</b> blue fighter
                  </>
                )}
              </Text>
              <Menu position="bottom-end" withArrow>
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="lg"
                    aria-label="More"
                  >
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconRestore size={16} />}
                    onClick={() => {
                      if (
                        confirm(
                          "Replace your code with the starter code? Your current code will be lost.",
                        )
                      )
                        setCode(starter.code);
                    }}
                  >
                    Start over with the starter code
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </div>
            <CodeEditor
              ref={editor}
              value={code}
              onChange={setCode}
              onRun={startBattle}
              runtimeError={lineError}
              debug={debugInfo}
              onBreakpointsChange={setBreakpoints}
            />
          </div>
          {debugging && run ? (
            <DebugPanel
              dbg={dbg}
              run={run}
              onPreviewTick={setPreviewTick}
              onGoToLine={(l) => editor.current?.goToLine(l)}
            />
          ) : (
            <ConsolePanel
              logs={logs}
              visibleTick={result ? Infinity : visibleTick}
              onClear={battle.clearLogs}
              onGoToLine={(l) => editor.current?.goToLine(l)}
              onDebug={
                debugBlocked ? undefined : (l) => openDebugger(l.tick, l.unit)
              }
            />
          )}
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
            fog={fog}
            onTick={setVisibleTick}
            onFinished={onFinished}
            inspect={inspect}
            onPickUnit={(id) =>
              run?.infos.get(id)?.team === "blue" && dbg.selectUnit(id)
            }
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
                onReplay={battle.replay}
                onClose={battle.closeResult}
                onSpy={() => setSpyOpen(true)}
              />
            )}
            {runError && (
              <div
                className="cr-error-toast cr-panel"
                style={{
                  padding: "12px 16px",
                  borderColor: "rgba(248,113,113,0.6)",
                }}
              >
                <Text fw={700} c="red.3" mb={4}>
                  {runError.kind === "loop"
                    ? "🌀 Your code got stuck!"
                    : runError.kind === "runtime"
                      ? "💥 Your fighters are confused!"
                      : "💥 Oops! Your code has a problem"}
                  {runError.line ? ` (line ${runError.line})` : ""}
                </Text>
                <Text size="sm">{runError.message}</Text>
                <Group gap={8} mt={8}>
                  {runError.line && (
                    <Button
                      size="xs"
                      color="red"
                      variant="light"
                      onClick={() => editor.current?.goToLine(runError.line!)}
                    >
                      Show me line {runError.line}
                    </Button>
                  )}
                  {runError.kind === "runtime" &&
                    firstError &&
                    !debugBlocked && (
                      <Button
                        size="xs"
                        color="yellow"
                        variant="light"
                        leftSection={<IconBug size={14} />}
                        onClick={() =>
                          openDebugger(firstError.tick, firstError.unit)
                        }
                      >
                        Step through it
                      </Button>
                    )}
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={battle.dismissError}
                  >
                    OK
                  </Button>
                </Group>
              </div>
            )}
          </Arena>

          <BattleControls
            level={level}
            run={run}
            debugging={debugging}
            battling={battling}
            paused={paused}
            speed={speed}
            fog={fog}
            debugBlocked={debugBlocked}
            onTogglePause={() => setPaused((value) => !value)}
            onSpeedChange={setSpeed}
            onSkip={battle.skip}
            onReplay={battle.replay}
            onDebug={() => openDebugger()}
            onCloseDebugger={dbg.close}
            onFogChange={setFog}
          />
        </section>
      </main>

      <LevelMap
        opened={mapOpen}
        onClose={() => setMapOpen(false)}
        progress={progress}
        current={levelId}
        onPick={pickLevel}
      />
      <GuideDrawer
        opened={guideOpen}
        onClose={() => setGuideOpen(false)}
        onInsert={(c) => editor.current?.insert(c)}
      />
      <SpyModal
        opened={spyOpen}
        onClose={() => setSpyOpen(false)}
        level={level}
      />
      <WelcomeModal opened={welcomeOpen} onClose={acknowledgeIntro} />
    </div>
  );
}
