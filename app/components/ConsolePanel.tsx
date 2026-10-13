import { ActionIcon, Badge, Tooltip } from "@mantine/core";
import { IconChevronDown, IconChevronUp, IconTerminal2, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { TICKS_PER_SECOND } from "~/game/constants";
import type { LogEntry } from "~/game/types";

interface Props {
  logs: LogEntry[];
  visibleTick: number;
  onClear: () => void;
  onGoToLine: (line: number) => void;
}

const ICON: Record<LogEntry["kind"], string> = { log: "💬", error: "💥", warn: "⚠️", info: "ℹ️" };

function fmt(tick: number) {
  const s = tick / TICKS_PER_SECOND;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
}

export function ConsolePanel({ logs, visibleTick, onClear, onGoToLine }: Props) {
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
        Console
        {shown.length > 0 && (
          <Badge size="sm" variant="light" color={errors ? "red" : "violet"}>
            {shown.length}
          </Badge>
        )}
        <span style={{ flex: 1 }} />
        <Tooltip label="Clear messages" withArrow>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            aria-label="Clear console"
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Tooltip>
        <ActionIcon size="sm" variant="subtle" color="gray" aria-label="Toggle console">
          {open ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
        </ActionIcon>
      </div>
      {open && (
        <div className="cr-console-body" ref={body}>
          {shown.length === 0 && (
            <div className="cr-log" style={{ color: "#6b6390", fontFamily: "Fredoka, sans-serif" }}>
              Messages from log(...) and errors show up here. Try adding log(me.name, me.health) to your code!
            </div>
          )}
          {shown.map((l, i) => (
            <div key={i} className={`cr-log ${l.kind}`}>
              {l.tick >= 0 && <span className="cr-log-time">{fmt(l.tick)}</span>}
              <span>{ICON[l.kind]}</span>
              {l.unit && <span className="cr-log-unit">{l.unit}:</span>}
              <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{l.text}</span>
              {l.line && (
                <span className="cr-log-line" onClick={() => onGoToLine(l.line!)}>
                  line {l.line}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
