import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TrendingUp,
  Award,
  ShieldCheck,
  AlertTriangle,
  Clock,
  RotateCcw,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { erpApi } from '../../api/client'
import { PageHeader, Card, StatCard, Badge, EmptyState, Skeleton, ErrorState } from '../../components/common'
import { WeeklyKpiTrendGraph, LifetimeXpStackedChart, type WeeklyKpiItem } from '../../components/performance/KpiXpWidgets'

export function MyPerformancePage() {
  const { currentUser } = useApp()
  const [loading, setLoading] = useState(true)
  const [kpiSeries, setKpiSeries] = useState<WeeklyKpiItem[]>([])
  const [xpSummary, setXpSummary] = useState<{
    lifetimeXp: number
    postedXp: number
    pendingXp: number
    frozenXp: number
    byCategory?: Record<string, number>
  } | null>(null)
  const [disciplinaryHistory, setDisciplinaryHistory] = useState<any[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return
    setLoading(true)
    setLoadError(null)
    try {
      const [series, xp, ledger] = await Promise.all([
        erpApi.getMyKpiSeries(),
        erpApi.getMyXpSummary(),
        erpApi.getMyLedger({ limit: 50 }),
      ])

      setKpiSeries(Array.isArray(series) ? series : [])
      setXpSummary(xp)

      // Filter disciplinary or reversal items from ledger
      const disciplinary = (ledger?.items || []).filter(
        (i: any) =>
          i.actionType?.includes('DISCIPLINARY') ||
          i.actionType?.includes('REVERSAL') ||
          i.actionType?.includes('PENALTY') ||
          i.triggerEvent?.includes('DISCIPLINARY'),
      )
      setDisciplinaryHistory(disciplinary)
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load performance metrics.')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Derive current week details
  const currentWeekRecord = useMemo(() => {
    if (kpiSeries.length === 0) return null
    return kpiSeries[kpiSeries.length - 1]
  }, [kpiSeries])

  const isCurrentProvisional = Boolean(
    currentWeekRecord?.isProvisional ||
      currentWeekRecord?.evaluationStatus === 'PROVISIONAL',
  )
  const isInactive = Boolean(currentWeekRecord?.isInactive)

  const activePenalty = Boolean(
    currentWeekRecord?.inactivityPenaltyApplied ||
      (currentWeekRecord as any)?.inactivityPenaltyPending,
  )

  const roleTitle = currentUser?.role?.toUpperCase() || 'DEVELOPER'

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Performance & Standing"
        subtitle="Authoritative weekly KPI formula breakdown, append-only XP balances, and governance standing."
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      ) : loadError ? (
        <ErrorState
          title="Unable to load performance data"
          description="Could not synchronize weekly KPI series or append-only XP balances."
          error={loadError}
          onRetry={loadData}
        />
      ) : (
        <>
          {/* Top Status & Evaluation State Banner */}
          <Card className="border-[var(--primary)]/30 bg-[var(--surface)]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[var(--text)]">
                      Current Evaluation Status
                    </h3>
                    {isInactive ? (
                      <Badge variant="danger">INACTIVE (N/A)</Badge>
                    ) : isCurrentProvisional ? (
                      <Badge variant="warning">
                        PROVISIONAL (sweep runs Sunday 23:59 Asia/Dhaka)
                      </Badge>
                    ) : (
                      <Badge variant="success">OFFICIAL (hash-chained)</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Role Tier:{' '}
                    <span className="font-semibold text-[var(--text)]">{roleTitle}</span> • Week{' '}
                    {currentWeekRecord?.weekNumber ?? 47}, {currentWeekRecord?.year ?? 2026}
                  </p>
                </div>
              </div>

              {/* Inactivity status alert pill */}
              <div className="flex items-center gap-2">
                {activePenalty ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Active 10% Inactivity Penalty</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Inactivity Penalty: Clear</span>
                  </div>
                )}
              </div>
            </div>

            {/* Inactivity Explanation If Active */}
            {activePenalty && (
              <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Inactivity Penalty Active: </span>
                  Because 0 deliverables were recorded during a prior cycle, the next evaluated task
                  will absorb a 10% deduction upon completion. Regular completion restores normal standing.
                </div>
              </div>
            )}
          </Card>

          {/* XP Balance StatCards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Posted XP (Released)"
              value={(xpSummary?.postedXp ?? 0).toLocaleString()}
              trend="Permanent hash-chained balance"
              trendTone="success"
              icon={Award}
            />
            <StatCard
              label="Pending XP"
              value={(xpSummary?.pendingXp ?? 0).toLocaleString()}
              trend="Awaiting Sunday sweep"
              trendTone="warning"
              icon={Clock}
            />
            <StatCard
              label="Frozen XP"
              value={(xpSummary?.frozenXp ?? 0).toLocaleString()}
              trend="Requires 4-Exec consensus"
              trendTone="danger"
              icon={Lock}
            />
            <StatCard
              label="Lifetime Career XP"
              value={(xpSummary?.lifetimeXp ?? 0).toLocaleString()}
              trend="Monotonic progression"
              trendTone="info"
              icon={TrendingUp}
            />
          </div>

          {/* Current Week KPI Breakdown Card */}
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
              <div>
                <h4 className="text-sm font-bold text-[var(--text)]">Current Week Formula Breakdown</h4>
                <p className="text-xs text-[var(--muted)]">
                  Live inputs reflecting current reviewer scores for Week {currentWeekRecord?.weekNumber ?? 47}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--muted)] block">Calculated Standing</span>
                <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                  {currentWeekRecord?.score !== null && currentWeekRecord?.score !== undefined
                    ? Number(currentWeekRecord.score).toFixed(2)
                    : 'N/A'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
                <span className="text-[11px] text-[var(--muted)] font-medium">PM Satisfaction</span>
                <div className="text-lg font-bold text-[var(--text)] font-mono mt-0.5">
                  {currentWeekRecord?.pmScore ?? 85} / 100
                </div>
                <span className="text-[10px] text-[var(--muted)]">Weight: 50%</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
                <span className="text-[11px] text-[var(--muted)] font-medium">CTO Multiplier</span>
                <div className="text-lg font-bold text-[var(--text)] font-mono mt-0.5">
                  {currentWeekRecord?.ctoScore ?? 1.0}
                </div>
                <span className="text-[10px] text-[var(--muted)]">Weight: 15%</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
                <span className="text-[11px] text-[var(--muted)] font-medium">CPO Multiplier</span>
                <div className="text-lg font-bold text-[var(--text)] font-mono mt-0.5">
                  {currentWeekRecord?.cpoScore ?? 1.0}
                </div>
                <span className="text-[10px] text-[var(--muted)]">Weight: 15%</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
                <span className="text-[11px] text-[var(--muted)] font-medium">CFO Multiplier</span>
                <div className="text-lg font-bold text-[var(--text)] font-mono mt-0.5">
                  {currentWeekRecord?.cfoScore ?? 1.0}
                </div>
                <span className="text-[10px] text-[var(--muted)]">Weight: 10%</span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
                <span className="text-[11px] text-[var(--muted)] font-medium">CHRO Multiplier</span>
                <div className="text-lg font-bold text-[var(--text)] font-mono mt-0.5">
                  {currentWeekRecord?.chroScore ?? 1.0}
                </div>
                <span className="text-[10px] text-[var(--muted)]">Weight: 10%</span>
              </div>
            </div>
          </Card>

          {/* Dual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeeklyKpiTrendGraph data={kpiSeries} />
            <LifetimeXpStackedChart
              lifetimeXp={xpSummary?.lifetimeXp ?? 0}
              postedXp={xpSummary?.postedXp}
              pendingXp={xpSummary?.pendingXp}
              frozenXp={xpSummary?.frozenXp}
            />
          </div>

          {/* Reversal & Disciplinary History */}
          <Card>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[var(--muted)]" />
                <h4 className="text-sm font-bold text-[var(--text)]">
                  Disciplinary &amp; Reversal History
                </h4>
              </div>
              <span className="text-xs text-[var(--muted)] font-mono">
                {disciplinaryHistory.length} events on chain
              </span>
            </div>

            {disciplinaryHistory.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="Zero Disciplinary Actions"
                description="Your account is in full compliance with Pointfex engineering governance."
              />
            ) : (
              <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-card)]">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-[var(--surface-muted)] text-[var(--muted)] font-semibold border-b border-[var(--border)]">
                    <tr>
                      <th className="px-3 py-2.5">Seq</th>
                      <th className="px-3 py-2.5">Type</th>
                      <th className="px-3 py-2.5">Delta</th>
                      <th className="px-3 py-2.5">Reason &amp; Legal Reference</th>
                      <th className="px-3 py-2.5">Authorized By</th>
                      <th className="px-3 py-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {disciplinaryHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--surface-muted)]/50">
                        <td className="px-3 py-2 font-mono font-medium text-[var(--muted)]">
                          #{item.sequence}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={item.actionType.includes('REVERSAL') ? 'success' : 'danger'}>
                            {item.actionType}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-rose-500">
                          {item.deltaValue}
                        </td>
                        <td className="px-3 py-2 text-[var(--text)]">
                          {item.reason || 'Governance review'}
                        </td>
                        <td className="px-3 py-2 text-[var(--muted)] uppercase text-[10px]">
                          {item.authorizedRole}
                        </td>
                        <td className="px-3 py-2 text-[var(--muted)]">
                          {new Date(item.recordedAt || Date.now()).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
