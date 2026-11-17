import { useState } from 'react'
import {
  TrendingUp,
  Award,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Edit3,
  Check,
  X,
} from 'lucide-react'

// --------------------------------------------------------------------------
// 1. WEEKLY KPI TREND LINE GRAPH (WITH RED N/A INACTIVITY MARKERS)
// --------------------------------------------------------------------------
export interface WeeklyKpiItem {
  id: string
  weekNumber: number
  year: number
  score: number | string | null
  isInactive: boolean
  roleLevel?: number
  evaluationStatus?: string
  createdAt?: string
}

export function WeeklyKpiTrendGraph({ data }: { data: WeeklyKpiItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-[var(--muted)]">
        <TrendingUp className="mx-auto mb-2 h-8 w-8 text-[var(--muted)] opacity-60" />
        <p className="text-sm font-medium">No weekly KPI evaluations recorded yet.</p>
      </div>
    )
  }

  // Sort chronologically
  const sorted = [...data].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.weekNumber - b.weekNumber
  })

  const height = 180
  const width = 500
  const padding = 35

  const points = sorted.map((d, index) => {
    const x = padding + (index / Math.max(1, sorted.length - 1)) * (width - 2 * padding)
    const numericScore = d.isInactive || d.score === null ? 0 : Number(d.score)
    // 0 score at bottom, 100 at top
    const y = height - padding - (numericScore / 100) * (height - 2 * padding)
    return { x, y, score: d.score, isInactive: d.isInactive, week: d.weekNumber, year: d.year }
  })

  const pathD = points
    .filter((p) => !p.isInactive && p.score !== null)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition-colors">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-500 dark:text-indigo-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">Weekly KPI Trend</h3>
            <p className="text-xs text-[var(--muted)]">Bounded 0–100 weekly execution efficiency</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-[var(--text)]">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500"></span> Active KPI
          </span>
          <span className="flex items-center gap-1.5 font-medium text-rose-500">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span> N/A (Inactivity Penalty)
          </span>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full overflow-visible"
          style={{ minWidth: '360px' }}
        >
          {/* Grid lines */}
          <line
            x1={padding}
            y1={padding}
            x2={width - padding}
            y2={padding}
            stroke="currentColor"
            className="text-slate-200/50 dark:text-slate-800/80"
            strokeDasharray="4 4"
          />
          <text x={padding - 6} y={padding + 4} textAnchor="end" className="text-[10px] fill-[var(--muted)] font-mono">
            100
          </text>

          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="currentColor"
            className="text-slate-200/50 dark:text-slate-800/80"
            strokeDasharray="4 4"
          />
          <text x={padding - 6} y={height / 2 + 4} textAnchor="end" className="text-[10px] fill-[var(--muted)] font-mono">
            50
          </text>

          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="currentColor"
            className="text-slate-300 dark:text-slate-700"
          />
          <text
            x={padding - 6}
            y={height - padding + 4}
            textAnchor="end"
            className="text-[10px] fill-[var(--muted)] font-mono"
          >
            0
          </text>

          {/* Connected Path for active weeks */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#6366F1"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Dots & N/A Red Flags */}
          {points.map((p, i) => (
            <g key={i} className="transition-all duration-200">
              {p.isInactive ? (
                <g>
                  {/* Visual Red Inactivity Indicator Line */}
                  <line
                    x1={p.x}
                    y1={padding}
                    x2={p.x}
                    y2={height - padding}
                    stroke="#F43F5E"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.8"
                  />
                  {/* Red Marker Dot */}
                  <circle
                    cx={p.x}
                    cy={height - padding}
                    r="6.5"
                    className="fill-rose-500 stroke-[var(--surface)] stroke-2"
                  />
                  {/* Distinctive Visual Red Flag Banner */}
                  <rect
                    x={p.x - 14}
                    y={height - padding - 24}
                    width="28"
                    height="14"
                    rx="4"
                    className="fill-rose-600 drop-shadow-sm"
                  />
                  <text
                    x={p.x}
                    y={height - padding - 13}
                    textAnchor="middle"
                    className="text-[9px] font-extrabold fill-white tracking-wide"
                  >
                    N/A
                  </text>
                  <title>Inactivity Red Flag: 0 tasks completed in Week {p.week}. Triggers a 10% deduction on next evaluated task.</title>
                </g>
              ) : (
                <g>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    className="fill-[var(--surface)] stroke-indigo-500 stroke-2 hover:r-6 cursor-pointer"
                  />
                  <text
                    x={p.x}
                    y={p.y - 8}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-[var(--text)]"
                  >
                    {Math.round(Number(p.score))}
                  </text>
                  <title>Week {p.week}: {p.score} KPI score</title>
                </g>
              )}
              <text
                x={p.x}
                y={height - 10}
                textAnchor="middle"
                className="text-[10px] font-medium fill-[var(--muted)]"
              >
                W{p.week}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// 2. LIFETIME XP STACKED PROGRESSION BAR CHART
// --------------------------------------------------------------------------
export function LifetimeXpStackedChart({
  lifetimeXp,
  breakdown,
}: {
  lifetimeXp: number
  breakdown?: {
    smallXp?: number
    mediumXp?: number
    largeXp?: number
    criticalXp?: number
    customXp?: number
  }
}) {
  const currentXp = Math.max(0, lifetimeXp || 0)
  const currentLevel = Math.floor(currentXp / 1000) + 1
  const xpInCurrentLevel = currentXp % 1000
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / 1000) * 100))

  const small = breakdown?.smallXp || currentXp * 0.2
  const medium = breakdown?.mediumXp || currentXp * 0.4
  const large = breakdown?.largeXp || currentXp * 0.25
  const critical = breakdown?.criticalXp || currentXp * 0.15

  const total = small + medium + large + critical || 1
  const pSmall = (small / total) * 100
  const pMedium = (medium / total) * 100
  const pLarge = (large / total) * 100
  const pCritical = (critical / total) * 100

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition-colors">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500 dark:text-amber-400">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">Career XP Progression</h3>
            <p className="text-xs text-[var(--muted)]">Unbounded monotonic career volume (10x Task Weight)</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-2xl font-black tracking-tight text-[var(--text)]">
              {currentXp.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-amber-500">XP</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Level {currentLevel} Specialist
          </span>
        </div>
      </div>

      {/* Level Milestone Progress */}
      <div className="mb-3">
        <div className="mb-1.5 flex justify-between text-xs text-[var(--muted)]">
          <span>Level {currentLevel}</span>
          <span className="font-semibold text-[var(--text)] font-mono">
            {xpInCurrentLevel} / 1,000 XP to Level {currentLevel + 1}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/50 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Weight Distribution Stacked Bar */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          XP Composition by Task Weight
        </p>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200/50 dark:bg-slate-800">
          <div style={{ width: `${pSmall}%` }} className="bg-sky-400" title="Small Tasks (10 XP)" />
          <div
            style={{ width: `${pMedium}%` }}
            className="bg-indigo-500"
            title="Medium Tasks (30 XP)"
          />
          <div style={{ width: `${pLarge}%` }} className="bg-purple-500" title="Large Tasks (50 XP)" />
          <div
            style={{ width: `${pCritical}%` }}
            className="bg-amber-500"
            title="Critical Tasks (100 XP)"
          />
        </div>

        <div className="mt-2.5 flex flex-wrap gap-3 text-[11px] text-[var(--muted)]">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> Small (10 XP)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-indigo-500" /> Medium (30 XP)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-purple-500" /> Large (50 XP)
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Critical (100 XP)
          </span>
        </div>
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// 3. IMMUTABLE USER-FACING KPI & XP AUDIT LEDGER TABLE
// --------------------------------------------------------------------------
export interface KpiXpAuditItem {
  id: string
  sequence: number
  metricType: string // 'KPI' | 'XP'
  deltaValue: number | string
  resultingTotal?: number | string | null
  actionType: string
  triggerEvent: string
  authorizedRole: string
  authorizedBy?: { id: string; name: string; title: string } | null
  reason?: string | null
  createdAt: string
}

export function KpiXpAuditLedgerTable({
  logs,
  canEdit,
  onSaveAuditReason,
}: {
  logs: KpiXpAuditItem[]
  canEdit?: boolean
  onSaveAuditReason?: (logId: string, newReason: string) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingReason, setEditingReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-[var(--muted)]">
        <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-[var(--muted)] opacity-60" />
        <p className="text-sm font-medium">No audit ledger entries recorded yet.</p>
      </div>
    )
  }

  const handleStartEdit = (log: KpiXpAuditItem) => {
    setEditingId(log.id)
    setEditingReason(log.reason || '')
  }

  const handleSave = async (logId: string) => {
    if (!onSaveAuditReason) return
    setIsSaving(true)
    try {
      await onSaveAuditReason(logId, editingReason.trim())
      setEditingId(null)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs transition-colors">
      <div className="border-b border-[var(--border)] bg-slate-500/5 px-5 py-3.5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-bold text-[var(--text)]">
            Immutable Performance & XP Audit Log
          </h4>
          <p className="text-xs text-[var(--muted)]">
            Cryptographically linked ledger of score modifications, authorizing officers, and events
          </p>
        </div>
        {canEdit && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            CHRO Governance Active (Editable Audit)
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-500/10 text-[var(--muted)]">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Timestamp</th>
              <th className="py-2.5 px-4 font-semibold">Metric</th>
              <th className="py-2.5 px-4 font-semibold">Delta</th>
              <th className="py-2.5 px-4 font-semibold">Trigger Event</th>
              <th className="py-2.5 px-4 font-semibold">Authorized By</th>
              <th className="py-2.5 px-4 font-semibold">Reason / Audit Notes</th>
              {canEdit && <th className="py-2.5 px-4 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]/50">
            {logs.map((log) => {
              const delta = Number(log.deltaValue)
              const isPositive = delta > 0
              const isKpi = log.metricType === 'KPI'
              const isEditing = editingId === log.id

              return (
                <tr key={log.id} className="hover:bg-slate-500/5 transition-colors">
                  <td className="py-2.5 px-4 text-[var(--muted)] font-mono whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-bold text-[10px] ${
                        isKpi
                          ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                      }`}
                    >
                      {log.metricType}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-bold whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-0.5 font-mono ${
                        delta === 0
                          ? 'text-[var(--muted)]'
                          : isPositive
                            ? 'text-emerald-500 dark:text-emerald-400'
                            : 'text-rose-500 dark:text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : delta < 0 ? (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      ) : null}
                      {isPositive ? `+${delta}` : delta} {isKpi ? 'pts' : 'XP'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-[var(--text)]">{log.triggerEvent}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="font-semibold text-[var(--text)]">
                      {log.authorizedBy?.name || log.authorizedRole}
                    </span>
                    {log.authorizedBy?.title && (
                      <span className="block text-[10px] text-[var(--muted)]">
                        {log.authorizedBy.title}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-[var(--muted)] max-w-sm">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingReason}
                          onChange={(e) => setEditingReason(e.target.value)}
                          className="w-full px-2 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                          placeholder="Update audit note..."
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSave(log.id)}
                          disabled={isSaving}
                          className="p-1 rounded-md bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                          title="Save change"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded-md bg-rose-500/20 text-rose-500 hover:bg-rose-500/30"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="truncate block" title={log.reason || '—'}>
                        {log.reason || '—'}
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(log)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-slate-500/10 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
