import { useEffect, useMemo, useRef, useState } from 'react';
import run from '../../data/replay/consolidate-2026-11-01.json';
import { track } from '../lib/track';

type Event = (typeof run.events)[number] & { verdict?: string; time?: string };
const events = run.events as Event[];

const ACTOR: Record<string, string> = {
  executor: 'Executor',
  verifier: 'Verifier',
  owner: 'Owner (me)',
  check: 'Check',
};
const BASE_MS = 2600;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Phase status after the first `n` events: last verdict seen in that phase. */
function phaseStatus(n: number): Map<number, string> {
  const st = new Map<number, string>();
  for (const e of events.slice(0, n)) {
    if (e.phase === null) continue;
    if (!st.has(e.phase)) st.set(e.phase, 'running');
    if (e.verdict === 'PASS' || e.verdict === 'GO' || e.verdict === 'STOP') st.set(e.phase, e.verdict);
    if (e.kind === 'action' && e.phase === 5) st.set(e.phase, 'done');
  }
  return st;
}

export default function Replay() {
  const [shown, setShown] = useState(1); // number of events revealed
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const list = useRef<HTMLOListElement>(null);
  const done = shown >= events.length;

  useEffect(() => {
    if (!playing || done) {
      if (done) setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setShown((n) => n + 1), BASE_MS / speed);
    return () => window.clearTimeout(t);
  }, [playing, shown, speed, done]);

  // Keep the newest event in view inside the log (not the page).
  useEffect(() => {
    const el = list.current?.lastElementChild as HTMLElement | null;
    if (el && list.current) {
      list.current.scrollTo({ top: el.offsetTop, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }, [shown]);

  const status = useMemo(() => phaseStatus(shown), [shown]);
  const current = events[shown - 1]!;

  return (
    <section className="rp" aria-label={`Replay: ${run.title}, ${run.date}`}>
      <div className="rp-controls" role="group" aria-label="Replay controls">
        <button
          type="button"
          onClick={() => {
            if (!playing) track(done ? 'replay:restart' : 'replay:play');
            if (done) {
              setShown(1);
              setPlaying(true);
            } else setPlaying((p) => !p);
          }}
        >
          {playing ? '❚❚ Pause' : done ? '↺ Replay' : '▶ Play'}
        </button>
        <button type="button" onClick={() => setShown((n) => Math.max(1, n - 1))} disabled={shown <= 1}>
          ◀ Back
        </button>
        <button type="button" onClick={() => setShown((n) => Math.min(events.length, n + 1))} disabled={done}>
          Next ▶
        </button>
        <button type="button" onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))}>
          Speed {speed}×
        </button>
        <span className="rp-count" aria-hidden="true">
          {shown}/{events.length}
        </span>
      </div>

      <ol className="rp-phases" aria-label="Phases">
        {run.phases.map((p) => {
          const s = status.get(p.id) ?? 'pending';
          return (
            <li key={p.id} className={`rp-phase rp-s-${s.toLowerCase()}`}>
              <span className="rp-pn">{p.id}</span>
              <span className="rp-pname">{p.name}</span>
              <span className="rp-pstate">{s === 'pending' ? '—' : s === 'running' ? '…' : s}</span>
            </li>
          );
        })}
      </ol>

      <p className="rp-now" aria-live="polite">
        <span className={`rp-actor rp-a-${current.actor}`}>{ACTOR[current.actor]}</span>
        {current.verdict ? <span className={`rp-v rp-v-${current.verdict.toLowerCase()}`}>{current.verdict}</span> : null}{' '}
        {current.text}
      </p>

      <ol className="rp-log" ref={list} aria-label="Event log">
        {events.slice(0, shown).map((e, i) => (
          <li key={i} className={i === shown - 1 ? 'rp-e rp-e-now' : 'rp-e'}>
            <span className="rp-time">{e.time ?? ''}</span>
            <span className="rp-phase-tag">{e.phase === null ? '' : `P${e.phase}`}</span>
            <span className={`rp-actor rp-a-${e.actor}`}>{ACTOR[e.actor]}</span>
            {e.verdict ? <span className={`rp-v rp-v-${e.verdict.toLowerCase()}`}>{e.verdict}</span> : null}
            <span className="rp-text">{e.text}</span>
          </li>
        ))}
      </ol>
      <p className="rp-note">
        Reconstructed from the procedure, the wiki commits after each phase and the session log of the run. Times are
        shown only where a commit fixes them.
      </p>
    </section>
  );
}
