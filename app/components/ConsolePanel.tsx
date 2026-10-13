import { ActionIcon, Badge, Tooltip } from "@mantine/core";
import { IconBug, IconChevronDown, IconChevronUp, IconTerminal2, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { TICKS_PER_SECOND } from "@code-royale/engine";
import type { ConsoleEntry } from "~/domain/messages";
import { useFormatMessage } from "~/i18n";

interface Props {
  logs: ConsoleEntry[];
  visibleTick: number;
  onClear: () => void;
  onGoToLine: (line: number) => void;
  /** Debug the moment a message was printed (not given when the debugger can't run). */
  onDebug?: (entry: ConsoleEntry) => void;
}

const ICON: Record<ConsoleEntry["kind"], string> = { log: "💬", error: "💥", warn: "⚠️" };

function fmt(tick: number) {
  const s = tick / TICKS_PER_SECOND;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
}

export function ConsolePanel({ logs, visibleTick, onClear, onGoToLine, onDebug }: Props) {
  const { t } = useTranslation();
  const formatMessage = useFormatMessage();
  const [open, setOpen] = useState(true);
  const body = useRef<HTMLDivElement>(null);
  // Messages appear in sync with the battle replay (errors show up right away).
  const shown = logs.filter((l) => l.tick <= visibleTick || l.kind === "error" || l.tick < 0);
  const errors = shown.filter((l) => l.kind === "error").length;

  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length, open]);

  return (
    <div className={`cr-panel cr-console ${open ? "" : "collapsed"}`}>
      <div className="cr-console-head" onClick={() => setOpen((o) => !o)}>
        <IconTerminal2 size={16} />
        {t("console.title")}
        {shown.length > 0 && (
          <Badge size="sm" variant="light" color={errors ? "red" : "violet"}>
            {shown.length}
          </Badge>
        )}
        <span style={{ flex: 1 }} />
        <Tooltip label={t("console.clear")} withArrow>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            aria-label={t("console.clearLabel")}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Tooltip>
        <ActionIcon size="sm" variant="subtle" color="gray" aria-label={t("console.toggle")}>
          {open ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
        </ActionIcon>
      </div>
      {open && (
        <div className="cr-console-body" ref={body}>
          {shown.length === 0 && (
            <div className="cr-log" style={{ color: "#6b6390", fontFamily: "Fredoka, sans-serif" }}>
              {t("console.empty")}
            </div>
          )}
          {shown.map((l, i) => (
            <div key={i} className={`cr-log ${l.kind}`}>
              {l.tick >= 0 && <span className="cr-log-time">{fmt(l.tick)}</span>}
              <span>{ICON[l.kind]}</span>
              {l.unit && <span className="cr-log-unit">{l.unit}:</span>}
              <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{l.kind === "log" ? l.text : formatMessage(l.message)}</span>
              {l.line && (
                <span className="cr-log-line" onClick={() => onGoToLine(l.line!)}>
                  {t("console.line", { line: l.line })}
                </span>
              )}
              {onDebug && l.tick >= 0 && l.unit && (
                <Tooltip label={t("console.debugTooltip", { unit: l.unit })} withArrow>
                  <ActionIcon className="cr-log-debug" size="xs" variant="subtle" color="yellow" onClick={() => onDebug(l)} aria-label={t("console.debugLabel")}>
                    <IconBug size={13} />
                  </ActionIcon>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
