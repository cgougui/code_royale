import {
  ActionIcon,
  Button,
  Loader,
  Slider,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowForwardUp,
  IconArrowLeft,
  IconBug,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerSkipBack,
  IconPlayerTrackNext,
  IconStepInto,
  IconStepOut,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  TICKS_PER_SECOND,
  type Inspected,
  type StepMove,
  type TraceStep,
} from "@code-royale/engine";
import { UnitIcon } from "~/components/Icons";
import {
  blueFightersAt,
  lastTick,
  type BattleReplay,
} from "~/domain/battle-replay";
import type { Debugger } from "~/hooks/use-debugger";
import { useFormatInspected, useFormatMessage } from "~/i18n";

interface Props {
  dbg: Debugger;
  run: BattleReplay;
  /** The slider is being dragged: show this tick in the arena (null when released). */
  onPreviewTick: (tick: number | null) => void;
  onGoToLine: (line: number) => void;
}

const SHORTCUTS: Record<string, StepMove> = {
  F7: "back",
  F8: "continue",
  F10: "over",
  F11: "into",
};

function clock(tick: number) {
  const s = tick / TICKS_PER_SECOND;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
}

export function DebugPanel({ dbg, run, onPreviewTick, onGoToLine }: Props) {
  const { t } = useTranslation();
  const formatMessage = useFormatMessage();
  const st = dbg.state!;
  const trace = st.trace;
  const step: TraceStep | undefined = trace?.steps[st.step];
  const prev = trace && st.step > 0 ? trace.steps[st.step - 1] : undefined;
  const [scrub, setScrub] = useState<number | null>(null);
  const name = run.infos.get(st.unitId)?.name ?? t("debugger.yourFighter");
  const fighters = blueFightersAt(run, scrub ?? st.tick);
  const maxTick = lastTick(run);

  // Keyboard shortcuts, like in a real debugger.
  const { move } = dbg;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m = e.key === "F11" && e.shiftKey ? "out" : SHORTCUTS[e.key];
      if (!m) return;
      e.preventDefault();
      move(m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const changed = useMemo(() => {
    const out = new Set<string>();
    if (!step || !prev) return out;
    const before = new Map(
      prev.vars.map((v) => [v.name, JSON.stringify(v.value)]),
    );
    for (const v of step.vars)
      if (before.has(v.name) && before.get(v.name) !== JSON.stringify(v.value))
        out.add(v.name);
    return out;
  }, [step, prev]);

  const output =
    trace && step
      ? trace.output.slice(0, step.kind === "line" ? step.output : undefined)
      : [];

  return (
    <div className={`cr-panel cr-debug ${st.busy ? "busy" : ""}`}>
      <div className="cr-debug-head">
        <IconBug size={18} color="#fbbf24" />
        <Text fw={700} size="sm">
          {t("debugger.title")}
        </Text>
        <div className="cr-debug-fighters">
          {fighters.map((id) => {
            const info = run.infos.get(id)!;
            return (
              <Tooltip
                key={id}
                label={t("debugger.pickFighter", { name: info.name })}
                withArrow
              >
                <button
                  className={`cr-debug-fighter ${id === st.unitId ? "on" : ""}`}
                  onClick={() => dbg.selectUnit(id)}
                >
                  <UnitIcon type={info.type} team="blue" size={24} />
                  {info.name}
                </button>
              </Tooltip>
            );
          })}
        </div>
        <span style={{ flex: 1 }} />
        {st.busy && <Loader size={14} color="yellow" />}
        <Tooltip label={t("debugger.stop")} withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={dbg.close}
            aria-label={t("debugger.stopLabel")}
          >
            <IconX size={16} />
          </ActionIcon>
        </Tooltip>
      </div>

      <div className="cr-debug-time">
        <Tooltip label={t("debugger.previousTick")} withArrow>
          <ActionIcon
            size="sm"
            variant="light"
            color="gray"
            onClick={() => dbg.setTick(st.tick - 1)}
            disabled={st.tick <= 0}
            aria-label={t("debugger.previousTickLabel")}
          >
            <IconChevronLeft size={14} />
          </ActionIcon>
        </Tooltip>
        <Slider
          style={{ flex: 1 }}
          size="sm"
          color="yellow"
          min={0}
          max={maxTick}
          value={scrub ?? st.tick}
          label={(t) => clock(t)}
          onChange={(t) => {
            setScrub(t);
            onPreviewTick(t);
          }}
          onChangeEnd={(t) => {
            setScrub(null);
            onPreviewTick(null);
            dbg.setTick(t);
          }}
          aria-label={t("debugger.timeLabel")}
        />
        <Tooltip label={t("debugger.nextTick")} withArrow>
          <ActionIcon
            size="sm"
            variant="light"
            color="gray"
            onClick={() => dbg.setTick(st.tick + 1)}
            disabled={st.tick >= maxTick}
            aria-label={t("debugger.nextTickLabel")}
          >
            <IconChevronRight size={14} />
          </ActionIcon>
        </Tooltip>
        <Text size="xs" ff="monospace" c="dimmed" w={58} ta="right">
          ⏱ {clock(scrub ?? st.tick)}
        </Text>
      </div>

      <div className="cr-debug-controls">
        <StepButton
          label={t("debugger.restart")}
          tip={t("debugger.restartTip")}
          icon={<IconPlayerSkipBack size={14} />}
          onClick={() => dbg.goToStep(0)}
          disabled={!trace || st.step === 0}
        />
        <StepButton
          label={t("debugger.back")}
          tip={t("debugger.backTip")}
          icon={<IconArrowLeft size={14} />}
          onClick={() => dbg.move("back")}
          disabled={!trace}
        />
        <StepButton
          label={t("debugger.step")}
          tip={t("debugger.stepTip")}
          icon={<IconStepInto size={14} />}
          onClick={() => dbg.move("into")}
          disabled={!trace}
          main
        />
        <StepButton
          label={t("debugger.over")}
          tip={t("debugger.overTip")}
          icon={<IconArrowForwardUp size={14} />}
          onClick={() => dbg.move("over")}
          disabled={!trace}
        />
        <StepButton
          label={t("debugger.out")}
          tip={t("debugger.outTip")}
          icon={<IconStepOut size={14} />}
          onClick={() => dbg.move("out")}
          disabled={!step || step.depth === 0}
        />
        <StepButton
          label={t("debugger.continue")}
          tip={t("debugger.continueTip")}
          icon={<IconPlayerTrackNext size={14} />}
          onClick={() => dbg.move("continue")}
          disabled={!trace}
        />
        <span style={{ flex: 1 }} />
        {trace && step && (
          <StepStatus
            step={step}
            index={st.step}
            total={trace.steps.length}
            onGoToLine={onGoToLine}
          />
        )}
      </div>

      {st.notice && (
        <div className="cr-debug-notice">{formatMessage(st.notice)}</div>
      )}

      {trace && step ? (
        <div className="cr-debug-body">
          <div className="cr-debug-col">
            <div className="cr-debug-title">{t("debugger.variables")}</div>
            {step.vars.length === 0 ? (
              <div className="cr-debug-empty">{t("debugger.noVariables")}</div>
            ) : (
              step.vars.map((v) => (
                <ValueRow
                  key={v.name}
                  name={v.name}
                  value={v.value}
                  changed={changed.has(v.name)}
                />
              ))
            )}
            <details className="cr-debug-context">
              <summary>{t("debugger.knows", { name })}</summary>
              {trace.context.map((v) => (
                <ValueRow key={v.name} name={v.name} value={v.value} />
              ))}
            </details>
          </div>
          <div className="cr-debug-col">
            <div className="cr-debug-title">{t("debugger.order")}</div>
            <div className={`cr-debug-order ${step.order ? "" : "none"}`}>
              {step.order ?? t("debugger.noOrder")}
            </div>
            {step.kind === "end" && (
              <div className="cr-debug-done">{t("debugger.done")}</div>
            )}
            {step.kind === "error" && step.error && (
              <div className="cr-debug-crash">
                💥 {formatMessage(step.error)}
              </div>
            )}
            {trace.truncated && (
              <div className="cr-debug-empty">
                {t("debugger.truncated", { count: trace.steps.length - 1 })}
              </div>
            )}
            <div className="cr-debug-title">{t("debugger.output")}</div>
            {output.length === 0 ? (
              <div className="cr-debug-empty">{t("debugger.noOutput")}</div>
            ) : (
              output.map((o, i) => (
                <div key={i} className={`cr-log ${o.kind}`}>
                  {o.kind === "log" ? o.text : formatMessage(o.message)}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        !st.notice && (
          <div className="cr-debug-empty">{t("debugger.replaying")}</div>
        )
      )}
    </div>
  );
}

function StepButton({
  label,
  tip,
  icon,
  onClick,
  disabled,
  main,
}: {
  label: string;
  tip: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  main?: boolean;
}) {
  return (
    <Tooltip label={tip} withArrow multiline w={220}>
      <Button
        size="compact-sm"
        variant={main ? "filled" : "light"}
        color={main ? "yellow" : "gray"}
        c={main ? "dark.9" : undefined}
        leftSection={icon}
        onClick={onClick}
        disabled={disabled}
      >
        {label}
      </Button>
    </Tooltip>
  );
}

function StepStatus({
  step,
  index,
  total,
  onGoToLine,
}: {
  step: TraceStep;
  index: number;
  total: number;
  onGoToLine: (line: number) => void;
}) {
  const { t } = useTranslation();
  const values = { line: step.line, number: index + 1, total };
  // The line number inside the sentence is a link to that line.
  const components = {
    line: (
      <span className="cr-log-line" onClick={() => onGoToLine(step.line!)} />
    ),
  };
  return (
    <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
      {step.kind === "end" ? (
        t("debugger.statusDone")
      ) : step.kind === "error" ? (
        step.line ? (
          <Trans
            i18nKey="debugger.statusCrashedOn"
            values={values}
            components={components}
          />
        ) : (
          t("debugger.statusCrashed")
        )
      ) : step.line ? (
        <Trans
          i18nKey="debugger.statusStep"
          values={values}
          components={components}
        />
      ) : (
        t("debugger.statusStepNoLine", values)
      )}
    </Text>
  );
}

/** A variable, with what's inside it (click to open lists and objects). */
function ValueRow({
  name,
  value,
  depth = 0,
  changed = false,
}: {
  name: string;
  value: Inspected;
  depth?: number;
  changed?: boolean;
}) {
  const { t } = useTranslation();
  const formatInspected = useFormatInspected();
  const [open, setOpen] = useState(false);
  const expandable = !!value.children?.length;
  const toggle = () => expandable && setOpen((o) => !o);
  return (
    <>
      <div
        className={`cr-var ${changed ? "changed" : ""} ${expandable ? "expandable" : ""}`}
        style={{ paddingLeft: 6 + depth * 14 }}
        onClick={toggle}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle())
        }
        role={expandable ? "button" : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? open : undefined}
        title={changed ? t("debugger.changed") : undefined}
      >
        <span className="cr-var-toggle">
          {expandable ? (open ? "▾" : "▸") : ""}
        </span>
        <span className="cr-var-name">{name}</span>
        <span className={`cr-var-value ${value.kind}`}>
          {formatInspected(value)}
        </span>
      </div>
      {open &&
        value.children!.map((c) => (
          <ValueRow
            key={c.key}
            name={c.key}
            value={c.value}
            depth={depth + 1}
          />
        ))}
      {open && value.more ? (
        <div className="cr-var" style={{ paddingLeft: 6 + (depth + 1) * 14 }}>
          <span className="cr-var-toggle" />
          <span className="cr-var-value empty">
            {t("debugger.more", { count: value.more })}
          </span>
        </div>
      ) : null}
    </>
  );
}

