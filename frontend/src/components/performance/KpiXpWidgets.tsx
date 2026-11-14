import {
  TrendingUp,
  Award,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
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
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
        <TrendingUp className="mx-auto mb-2 h-8 w-8 text-slate-400" />
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Weekly KPI Trend</h3>
            <p className="text-xs text-slate-500">Bounded 0–100 weekly execution efficiency</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600"></span> Active KPI
          </span>
          <span className="flex items-center gap-1.5 font-medium text-rose-600">
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
            stroke="#F1F5F9"
            strokeDasharray="4 4"
          />
          <text x={padding - 6} y={padding + 4} textAnchor="end" className="text-[10px] fill-slate-400">
            100
          </text>

          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="#F1F5F9"
            strokeDasharray="4 4"
          />
          <text x={padding - 6} y={height / 2 + 4} textAnchor="end" className="text-[10px] fill-slate-400">
            50
          </text>

          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#CBD5E1"
          />
          <text
            x={padding - 6}
            y={height - padding + 4}
            textAnchor="end"
            className="text-[10px] fill-slate-400"
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

          {/* Dots */}
          {points.map((p, i) => (
            <g key={i}>
              {p.isInactive ? (
                <>
                  <circle
                    cx={p.x}
                    cy={height - padding}
                    r="6"
                    className="fill-rose-500 stroke-white stroke-2"
                  />
                  <text
                    x={p.x}
                    y={height - padding - 10}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-rose-600"
                  >
                    N/A
                  </text>
                </>
              ) : (
                <>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    className="fill-white stroke-indigo-600 stroke-2 hover:r-6"
                  />
                  <text
                    x={p.x}
                    y={p.y - 8}
                    textAnchor="middle"
                    className="text-[10px] font-medium fill-slate-700"
                  >
                    {Math.round(Number(p.score))}
                  </text>
                </>
              )}
              <text
                x={p.x}
                y={height - 10}
                textAnchor="middle"
                className="text-[10px] fill-slate-500"
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Career XP Progression</h3>
            <p className="text-xs text-slate-500">Unbounded monotonic career volume (10x Task Weight)</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {currentXp.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-amber-600">XP</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            Level {currentLevel} Specialist
          </span>
        </div>
      </div>

      {/* Level Milestone Progress */}
      <div className="mb-3">
        <div className="mb-1.5 flex justify-between text-xs text-slate-600">
          <span>Level {currentLevel}</span>
          <span className="font-semibold text-slate-900">
            {xpInCurrentLevel} / 1,000 XP to Level {currentLevel + 1}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Weight Distribution Stacked Bar */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          XP Composition by Task Weight
        </p>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
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

        <div className="mt-2.5 flex flex-wrap gap-3 text-[11px] text-slate-600">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> Small (10 XP)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-indigo-500" /> Medium (30 XP)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-purple-500" /> Large (50 XP)
          </span>
          <span className="flex items-center gap-1">
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

export function KpiXpAuditLedgerTable({ logs }: { logs: KpiXpAuditItem[] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
        <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-slate-400" />
        <p className="text-sm font-medium">No audit ledger entries found.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <h4 className="text-sm font-semibold text-slate-900">
          Immutable Performance & XP Audit Log
        </h4>
        <p className="text-xs text-slate-500">
          Cryptographically linked ledger of every score change, authorizing officer, and event
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-100/75 text-slate-600">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Timestamp</th>
              <th className="py-2.5 px-4 font-semibold">Metric</th>
              <th className="py-2.5 px-4 font-semibold">Delta</th>
              <th className="py-2.5 px-4 font-semibold">Trigger Event</th>
              <th className="py-2.5 px-4 font-semibold">Authorized By</th>
              <th className="py-2.5 px-4 font-semibold">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => {
              const delta = Number(log.deltaValue)
              const isPositive = delta > 0
              const isKpi = log.metricType === 'KPI'

              return (
                <tr key={log.id} className="hover:bg-slate-50/75">
                  <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-semibold text-[10px] ${
                        isKpi
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {log.metricType}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-bold whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-0.5 ${
                        delta === 0
                          ? 'text-slate-500'
                          : isPositive
                            ? 'text-emerald-600'
                            : 'text-rose-600'
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
                  <td className="py-2.5 px-4 font-medium text-slate-900">{log.triggerEvent}</td>
                  <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                    <span className="font-semibold text-slate-900">
                      {log.authorizedBy?.name || log.authorizedRole}
                    </span>
                    {log.authorizedBy?.title && (
                      <span className="block text-[10px] text-slate-400">
                        {log.authorizedBy.title}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">
                    {log.reason || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
