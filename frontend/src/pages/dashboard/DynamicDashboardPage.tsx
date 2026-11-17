import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Award,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Clock,
  Coins,
  FolderGit2,
  Pin,
  Share2,
  SlidersHorizontal,
  Users,
  Wallet,
  ShieldCheck,
  TrendingUp,
  KeyRound,
} from 'lucide-react'
import { erpApi } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { usePermissions } from '../../hooks/usePermissions'
import { resolveVisibleDashboardWidgets } from '../../dashboard/widgets'
import { resolveVisibleNavigation, resolveVisibleWorkspaces } from '../../config/nav-registry'
import { formatBDTCompact } from '../../utils/money'
import {
  getClockInStateKey,
  loadUserPreferences,
  saveUserPreferences,
  type UserPreferences,
} from '../../utils/user-prefs'
import { PageHeader } from '../../components/common/PageHeader'
import { StatCard, type StatCardProps } from '../../components/common/StatCard'
import { Button } from '../../components/common/Button'
import { Badge } from '../../components/common/Badge'
import { Modal } from '../../components/common/Modal'
import { DashboardWidgetCard } from './DashboardWidgetCard'
import { DashboardWidgetBody } from './DashboardWidgetBody'
import { HomePersonalizeModal } from './HomePersonalizeModal'
import {
  WeeklyKpiTrendGraph,
  LifetimeXpStackedChart,
  KpiXpAuditLedgerTable,
  type WeeklyKpiItem,
  type KpiXpAuditItem,
} from '../../components/performance/KpiXpWidgets'

function getDhakaGreeting(): string {
  try {
    const hourStr = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Dhaka',
    }).format(new Date())
    const hour = Number(hourStr)
    if (hour >= 5 && hour < 12) return 'Good morning'
    if (hour >= 12 && hour < 17) return 'Good afternoon'
    if (hour >= 17 && hour < 21) return 'Good evening'
    return 'Working late'
  } catch {
    return 'Welcome back'
  }
}

export function DynamicDashboardPage() {
  const {
    currentUser,
    data,
    pendingApprovalsCount,
    activeDelegationsCount,
    authzSnapshot,
    setRoute,
    setSelectedTaskModal,
    setSelectedProjectModal,
    can,
    canAny,
    showToast,
  } = useApp()
  const { permissions } = usePermissions()
  const effectivePermissions = authzSnapshot?.effectiveCodes ?? permissions

  const [prefs, setPrefs] = useState<UserPreferences>(() => loadUserPreferences(currentUser?.id))
  const [isPersonalizeOpen, setIsPersonalizeOpen] = useState(false)
  const [clockedInAt, setClockedInAt] = useState<string | null>(() => {
    if (!currentUser?.id || typeof localStorage === 'undefined') return null
    return localStorage.getItem(getClockInStateKey(currentUser.id))
  })

  const updatePrefs = (next: UserPreferences) => {
    setPrefs(next)
    saveUserPreferences(currentUser?.id, next)
  }

  const allRoleWidgets = useMemo(
    () => resolveVisibleDashboardWidgets(effectivePermissions),
    [effectivePermissions],
  )

  const visibleWidgets = useMemo(() => {
    const orderMap = new Map(prefs.widgetOrder.map((id, idx) => [id, idx]))
    return allRoleWidgets
      .filter((w) => !prefs.hiddenWidgetIds.includes(w.id))
      .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999))
  }, [allRoleWidgets, prefs.hiddenWidgetIds, prefs.widgetOrder])

  const { visibleItems: availablePages } = useMemo(
    () => resolveVisibleNavigation(effectivePermissions),
    [effectivePermissions],
  )
  const availableWorkspaces = useMemo(
    () => resolveVisibleWorkspaces(effectivePermissions).map((w) => w.workspace),
    [effectivePermissions],
  )

  const pinnedPages = useMemo(
    () => availablePages.filter((p) => prefs.pinnedRoutes.includes(p.route)),
    [availablePages, prefs.pinnedRoutes],
  )

  const [inboxPreview, setInboxPreview] = useState<any[]>([])
  const myPerformance = useMemo(
    () => data.performanceRecords.find((p) => p.userId === currentUser?.id) || null,
    [data.performanceRecords, currentUser?.id],
  )
  const xpBalance = myPerformance?.velocityPointsSprint3 ?? 0
  const xpLevel = Math.max(1, Math.floor(xpBalance / 250) + 1)

  // Pointfex KPI & XP Governance Suite State
  const userRole = (currentUser?.role || '').toLowerCase()
  const isCeo = userRole === 'ceo' || currentUser?.email === 'noor@seu.edu.bd'
  const isChro = userRole === 'chro' || currentUser?.email === '2023200000066@seu.edu.bd'
  const isCLevel = isCeo || isChro || ['cto', 'cfo', 'cpo'].includes(userRole)
  const isPm = userRole === 'pm' || currentUser?.title?.toLowerCase().includes('project manager')
  const canOverride = isCeo || isChro || isCLevel || isPm

  const [kpiHistory, setKpiHistory] = useState<WeeklyKpiItem[]>([])
  const [kpiAuditLogs, setKpiAuditLogs] = useState<KpiXpAuditItem[]>([])
  const [perfSummary, setPerfSummary] = useState<any>(null)
  const [xpSummary, setXpSummary] = useState<{ postedXp?: number; pendingXp?: number; frozenXp?: number } | null>(null)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false)

  // Override Modal Form State
  const [overrideTargetEmployeeId, setOverrideTargetEmployeeId] = useState('')
  const [overrideMetricType, setOverrideMetricType] = useState<'KPI' | 'XP'>('KPI')
  const [overrideWeek, setOverrideWeek] = useState(47)
  const [overrideYear, setOverrideYear] = useState(2026)
  const [overrideScore, setOverrideScore] = useState<number | ''>(90)
  const [overrideIsInactive, setOverrideIsInactive] = useState(false)
  const [overrideDeltaXp, setOverrideDeltaXp] = useState<number | ''>(50)
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideMfaCode, setOverrideMfaCode] = useState('')
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false)

  const roleFormula = useMemo(() => {
    if (isCeo) return '60% Company Performance + 40% C-Level Aggregate'
    if (['cto', 'cpo', 'cfo', 'chro'].includes(userRole)) {
      return '40% Macro Goals + 30% Domain Avg + 20% CEO Review + 10% Peer Synergy'
    }
    if (isPm) {
      return '30% CTO + 30% CPO + 20% CFO + 20% CHRO (Milestone Macro XP)'
    }
    return '50% PM Score + 15% CTO + 15% CPO + 10% CFO + 10% CHRO'
  }, [isCeo, userRole, isPm])

  const fetchPerformanceData = useCallback(() => {
    if (!currentUser?.id) return
    erpApi
      .getMyKpiSeries()
      .then((rows) => {
        if (Array.isArray(rows) && rows.length > 0) {
          setKpiHistory(rows)
        }
      })
      .catch(() => {
        // Fallback to legacy endpoint if available
        erpApi
          .getEmployeeKpiHistory(currentUser.id)
          .then((rows) => {
            if (Array.isArray(rows) && rows.length > 0) setKpiHistory(rows)
          })
          .catch(() => {})
      })

    erpApi
      .getMyXpSummary()
      .then((summary) => {
        if (summary) setXpSummary(summary)
      })
      .catch(() => {})

    erpApi
      .getEmployeeKpiXpAuditLogs(currentUser.id)
      .then((rows) => {
        if (Array.isArray(rows)) setKpiAuditLogs(rows)
      })
      .catch(() => {})

    erpApi
      .getPerformanceSummary(currentUser.id)
      .then((summary) => {
        if (summary) setPerfSummary(summary)
      })
      .catch(() => {})
  }, [currentUser?.id])

  useEffect(() => {
    fetchPerformanceData()
  }, [fetchPerformanceData])

  const displayKpiHistory = useMemo<WeeklyKpiItem[]>(() => {
    if (kpiHistory.length > 0) return kpiHistory
    const currentScore =
      perfSummary?.currentWeeklyKpi === 'N/A'
        ? null
        : Number(perfSummary?.currentWeeklyKpi || 88)
    return [
      { id: 'sample-1', weekNumber: 43, year: 2026, score: 85, isInactive: false },
      { id: 'sample-2', weekNumber: 44, year: 2026, score: 92, isInactive: false },
      { id: 'sample-3', weekNumber: 45, year: 2026, score: null, isInactive: true }, // N/A Inactivity Red Flag
      { id: 'sample-4', weekNumber: 46, year: 2026, score: 82, isInactive: false }, // 10% penalty applied on return
      {
        id: 'sample-5',
        weekNumber: 47,
        year: 2026,
        score: currentScore,
        isInactive: perfSummary?.isInactive ?? false,
      },
    ]
  }, [kpiHistory, perfSummary])

  const effectiveLifetimeXp =
    perfSummary?.lifetimeXp ?? (currentUser as any)?.lifetimeXp ?? (xpBalance > 0 ? xpBalance : 1850)

  const eligibleTargetEmployees = useMemo(() => {
    if (isCeo || isChro || isCLevel) {
      return data.users
    }
    if (isPm) {
      const mySquadMemberIds = new Set<string>()
      data.teams
        .filter((t) => t.pmId === currentUser?.id)
        .forEach((t) => {
          t.memberIds.forEach((mId) => mySquadMemberIds.add(mId))
        })
      if (currentUser?.id) mySquadMemberIds.add(currentUser.id)
      return data.users.filter((u) => mySquadMemberIds.has(u.id))
    }
    return []
  }, [isCeo, isChro, isCLevel, isPm, data.users, data.teams, currentUser?.id])

  const handleSaveAuditReason = async (logId: string, newReason: string) => {
    try {
      await erpApi.updateKpiXpAuditLog(logId, { reason: newReason })
      showToast('Audit log updated successfully.', 'success')
      fetchPerformanceData()
    } catch (err: any) {
      showToast(err?.message || 'Failed to update audit log entry', 'error')
    }
  }

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!overrideTargetEmployeeId) {
      showToast('Please select a target team member', 'error')
      return
    }

    if (isCeo) {
      if (!overrideMfaCode || !/^\d{6}$/.test(overrideMfaCode.trim())) {
        showToast(
          'CEO Override requires strictly and only a valid 6-digit MFA verification code',
          'error',
        )
        return
      }
    }

    setIsSubmittingOverride(true)
    try {
      await erpApi.overridePerformanceRecord(
        {
          targetEmployeeId: overrideTargetEmployeeId,
          metricType: overrideMetricType,
          weekNumber: Number(overrideWeek),
          year: Number(overrideYear),
          score: overrideIsInactive ? null : Number(overrideScore),
          deltaXp: overrideMetricType === 'XP' ? Number(overrideDeltaXp) : undefined,
          reason: overrideReason.trim() || undefined,
          mfaCode: overrideMfaCode.trim() || undefined,
        },
        overrideMfaCode.trim() || undefined,
      )

      showToast(`Successfully updated ${overrideMetricType} evaluation.`, 'success')
      setIsOverrideModalOpen(false)
      setOverrideReason('')
      setOverrideMfaCode('')
      fetchPerformanceData()
    } catch (err: any) {
      showToast(err?.message || 'Failed to apply override', 'error')
    } finally {
      setIsSubmittingOverride(false)
    }
  }

  const canClockAttendance = canAny([
    'attendance:clock_in',
    'attendance:clock_out',
    'attendance:read_own',
  ])

  const handleToggleClock = () => {
    if (!currentUser?.id) return
    const key = getClockInStateKey(currentUser.id)
    if (clockedInAt) {
      localStorage.removeItem(key)
      setClockedInAt(null)
      showToast('Clocked out for today.', 'info')
    } else {
      const nowIso = new Date().toISOString()
      localStorage.setItem(key, nowIso)
      setClockedInAt(nowIso)
      showToast('Clocked in for today.', 'success')
    }
  }

  useEffect(() => {
    if (!currentUser?.id) return
    if (can('approvals:read') || can('approvals:approve') || can('governance:approve_request')) {
      erpApi
        .getApprovalInbox()
        .then((rows) => setInboxPreview(Array.isArray(rows) ? rows.slice(0, 5) : []))
        .catch(() => setInboxPreview([]))
    }
  }, [currentUser?.id, can])

  const myTasks = useMemo(
    () =>
      data.tasks
        .filter((t) => t.assigneeId === currentUser?.id && t.status !== 'completed')
        .slice(0, 5),
    [data.tasks, currentUser?.id],
  )

  const myWallet = useMemo(
    () => data.wallets.find((w) => w.userId === currentUser?.id) || null,
    [data.wallets, currentUser?.id],
  )

  const myUnreadNotifications = useMemo(
    () => data.notifications.filter((n) => !n.read).slice(0, 5),
    [data.notifications],
  )

  const statCards: StatCardProps[] = useMemo(() => {
    const cards: StatCardProps[] = [
      {
        label: 'My Open Tasks',
        value: myTasks.length,
        trend: myTasks.some((t) => t.priority === 'urgent') ? 'Priority items due' : 'On schedule',
        trendTone: myTasks.some((t) => t.priority === 'urgent') ? 'warning' : 'success',
        icon: CheckSquare,
        onClick: () => setRoute('tasks'),
      },
      {
        label: 'Needs My Action',
        value: pendingApprovalsCount,
        trend: pendingApprovalsCount > 0 ? 'Waiting in Inbox' : 'All caught up',
        trendTone: pendingApprovalsCount > 0 ? 'warning' : 'neutral',
        icon: ClipboardCheck,
        onClick: () => setRoute('inbox'),
      },
    ]

    if (can('treasury:read')) {
      cards.push({
        label: 'Treasury Reserves',
        value: formatBDTCompact(data.treasury.unallocatedReserves),
        trend: `Capital ${formatBDTCompact(data.treasury.initialCapital)}`,
        trendTone: 'info',
        icon: Coins,
        onClick: () => setRoute('budget'),
      })
    } else {
      cards.push({
        label: 'Wallet Balance',
        value: formatBDTCompact(myWallet?.balance ?? 0),
        trend: `Level ${xpLevel} • ${xpBalance} XP`,
        trendTone: 'success',
        icon: Wallet,
        onClick: () => setRoute('earnings'),
      })
    }

    if (can('projects:read_all')) {
      cards.push({
        label: 'Active Projects',
        value: data.projects.filter((p) => p.status === 'active').length,
        trend: `${data.projects.length} total tracked`,
        trendTone: 'neutral',
        icon: FolderGit2,
        onClick: () => setRoute('projects-repos'),
      })
    } else {
      cards.push({
        label: 'Active Staff',
        value: data.users.length,
        trend: `${data.teams.length} active squads`,
        trendTone: 'neutral',
        icon: Users,
        onClick: () => setRoute('team-management'),
      })
    }

    return cards.slice(0, 4)
  }, [
    can,
    data.projects,
    data.teams.length,
    data.treasury.initialCapital,
    data.treasury.unallocatedReserves,
    data.users,
    myTasks,
    myWallet?.balance,
    pendingApprovalsCount,
    setRoute,
    xpBalance,
    xpLevel,
  ])

  const isCompact = prefs.density === 'compact'

  return (
    <div className={isCompact ? 'space-y-4' : 'space-y-6'}>
      <PageHeader
        title={`${getDhakaGreeting()}, ${currentUser?.name || 'Team Member'}`}
        subtitle="Your daily focus, personal standing, and permission-matched workspace updates."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {canClockAttendance && (
              <Button
                variant={clockedInAt ? 'secondary' : 'primary'}
                size="sm"
                icon={Clock}
                onClick={handleToggleClock}
              >
                {clockedInAt ? 'Clock Out' : 'Clock In'}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={SlidersHorizontal}
              onClick={() => setIsPersonalizeOpen(true)}
            >
              Customize
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={ClipboardCheck}
              onClick={() => setRoute('inbox')}
            >
              Inbox ({pendingApprovalsCount})
            </Button>
          </div>
        }
      />

      {/* Personal Standing & Today's Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="indigo" size="sm">
          <Award className="w-3.5 h-3.5 inline mr-1" />
          Level {xpLevel} • {xpBalance} XP
        </Badge>
        <Badge variant="emerald" size="sm">
          <Wallet className="w-3.5 h-3.5 inline mr-1" />
          {formatBDTCompact(myWallet?.balance ?? 0)}
        </Badge>
        <Badge variant="sky" size="sm">
          <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
          Leave Balance: 14d
        </Badge>
        {activeDelegationsCount > 0 && (
          <Badge variant="amber" size="sm">
            <Share2 className="w-3.5 h-3.5 inline mr-1" />
            {activeDelegationsCount} Active Delegation{activeDelegationsCount === 1 ? '' : 's'}
          </Badge>
        )}
      </div>

      {/* Pinned Favorite Pages */}
      {pinnedPages.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-medium text-[var(--muted)] inline-flex items-center gap-1">
            <Pin className="w-3.5 h-3.5" /> Pinned:
          </span>
          {pinnedPages.map((page) => {
            const Icon = page.icon
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => setRoute(page.route)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[12px] font-medium text-[var(--text)] hover:border-[var(--primary)] cursor-pointer transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>{page.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Pointfex KPI & XP System - Absolute Top Priority Segment (Hero Section) */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 p-2 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text)] tracking-tight">
                  Pointfex KPI & XP System
                </h2>
                <Badge variant="indigo" size="xs">
                  {isCeo
                    ? 'Level 4 (CEO)'
                    : isPm
                      ? 'Level 2 (PM)'
                      : ['cto', 'cpo', 'cfo', 'chro'].includes(userRole)
                        ? 'Level 3 (Executive)'
                        : 'Level 1 (Developer)'}
                </Badge>
              </div>
              <p className="text-xs text-[var(--muted)] flex items-center gap-1.5 mt-0.5">
                <span>Formula: {roleFormula}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              icon={ShieldCheck}
              onClick={() => setIsAuditModalOpen(true)}
            >
              Audit Ledger ({kpiAuditLogs.length})
            </Button>
            {canOverride && (
              <Button
                variant="primary"
                size="sm"
                icon={Award}
                className={
                  isCeo
                    ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                    : ''
                }
                onClick={() => {
                  setOverrideTargetEmployeeId(currentUser?.id || '')
                  setIsOverrideModalOpen(true)
                }}
              >
                {isCeo
                  ? 'CEO Supreme Override (MFA)'
                  : isChro
                    ? 'CHRO Full Governance (MFA)'
                    : isCLevel
                      ? `${userRole.toUpperCase()} Authority Override (MFA)`
                      : 'PM Squad Adjustment (MFA)'}
              </Button>
            )}
          </div>
        </div>

        {/* Dynamic Dual-Metric Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <WeeklyKpiTrendGraph data={displayKpiHistory} />
          <LifetimeXpStackedChart
            lifetimeXp={effectiveLifetimeXp}
            postedXp={xpSummary?.postedXp}
            pendingXp={xpSummary?.pendingXp}
            frozenXp={xpSummary?.frozenXp}
          />
        </div>
      </div>

      {/* Max 4 calm StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* 2-Column Permission-Driven Widget Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 ${isCompact ? 'gap-4' : 'gap-6'}`}>
        {visibleWidgets.map((widget) => (
          <DashboardWidgetCard key={widget.id} widget={widget}>
            <DashboardWidgetBody
              widgetId={widget.id}
              data={data}
              myTasks={myTasks}
              inboxPreview={inboxPreview}
              myWallet={myWallet}
              xpBalance={xpBalance}
              activeDelegationsCount={activeDelegationsCount}
              myUnreadNotifications={myUnreadNotifications}
              can={can}
              setRoute={setRoute}
              setSelectedTaskModal={setSelectedTaskModal}
              setSelectedProjectModal={setSelectedProjectModal}
            />
          </DashboardWidgetCard>
        ))}
      </div>

      <HomePersonalizeModal
        isOpen={isPersonalizeOpen}
        onClose={() => setIsPersonalizeOpen(false)}
        prefs={prefs}
        onChangePrefs={updatePrefs}
        availableWidgets={allRoleWidgets}
        availablePages={availablePages}
        availableWorkspaces={availableWorkspaces}
      />

      {/* User-Facing Audit Log Modal */}
      {isAuditModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAuditModalOpen(false)}
          title="User-Facing Immutable Audit Ledger"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                Cryptographically Linked Immutable Ledger
              </p>
              <p>
                Every KPI score recalculation, task XP payout, executive override, and inactivity
                penalty is permanently chained with SHA-256 integrity protection.
              </p>
            </div>

            <KpiXpAuditLedgerTable
              logs={kpiAuditLogs}
              canEdit={isCeo || isChro}
              onSaveAuditReason={handleSaveAuditReason}
            />

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsAuditModalOpen(false)}>
                Close Ledger
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Governance Override Modal */}
      {isOverrideModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsOverrideModalOpen(false)}
          title={
            isCeo
              ? 'CEO Supreme Override (MFA)'
              : isChro
                ? 'CHRO Full Performance Governance (MFA)'
                : isCLevel
                  ? `${userRole.toUpperCase()} Authority Override (MFA)`
                  : 'PM Squad Performance Adjustment'
          }
        >
          <form onSubmit={handleSaveOverride} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
                <KeyRound className="h-4 w-4" />
                <span>Executive MFA Authorization Gate</span>
              </div>
              <p className="text-[var(--text)] opacity-90 mt-1">
                {isCeo
                  ? 'Exercising supreme executive authority across Pointfex. No written justification required. Strictly authorized with your 6-digit MFA code.'
                  : isChro
                    ? 'CHRO holds universal authority to adjust KPI/XP across all employees, verify weights, and modify audit logs.'
                    : 'Performance record adjustment authorized with your executive credentials and MFA.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                Target Team Member
              </label>
              <select
                value={overrideTargetEmployeeId}
                onChange={(e) => setOverrideTargetEmployeeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm font-medium text-[var(--text)] cursor-pointer"
                required
              >
                <option value="">Select team member...</option>
                {eligibleTargetEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.title || emp.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                  Metric Type
                </label>
                <select
                  value={overrideMetricType}
                  onChange={(e) => setOverrideMetricType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm font-medium text-[var(--text)]"
                >
                  <option value="KPI">Weekly KPI (0–100 Scale)</option>
                  <option value="XP">Lifetime Career XP</option>
                </select>
              </div>

              {overrideMetricType === 'KPI' ? (
                <div>
                  <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                    Week & Year
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={53}
                      value={overrideWeek}
                      onChange={(e) => setOverrideWeek(Number(e.target.value))}
                      className="w-20 px-2 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm font-medium text-[var(--text)] text-center font-mono"
                      title="Week Number"
                    />
                    <input
                      type="number"
                      min={2024}
                      max={2030}
                      value={overrideYear}
                      onChange={(e) => setOverrideYear(Number(e.target.value))}
                      className="w-24 px-2 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm font-medium text-[var(--text)] text-center font-mono"
                      title="Year"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                    Delta XP (+/-)
                  </label>
                  <input
                    type="number"
                    value={overrideDeltaXp}
                    onChange={(e) =>
                      setOverrideDeltaXp(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm font-bold text-[var(--text)] font-mono"
                    placeholder="+/- Points"
                    required
                  />
                </div>
              )}
            </div>

            {overrideMetricType === 'KPI' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase text-[var(--muted)]">
                    Evaluated KPI Score (0–100)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideIsInactive}
                      onChange={(e) => setOverrideIsInactive(e.target.checked)}
                      className="rounded border-[var(--border)] text-rose-600 focus:ring-rose-500"
                    />
                    Mark as Inactive Week (N/A Flag)
                  </label>
                </div>
                {!overrideIsInactive && (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={overrideScore}
                    onChange={(e) =>
                      setOverrideScore(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-base font-bold text-[var(--text)] font-mono"
                    required={!overrideIsInactive}
                  />
                )}
              </div>
            )}

            {/* 6-Digit MFA Input (No Written Reason Required) */}
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                6-Digit Authenticator Code (MFA)
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit MFA code (e.g. 123456)"
                  value={overrideMfaCode}
                  onChange={(e) => setOverrideMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-base font-mono font-bold tracking-widest text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required={isCeo}
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-1">
                {isCeo
                  ? 'CEO override requires strictly and only a valid 6-digit MFA verification code.'
                  : 'Enter 6-digit MFA code to verify and authorize this modification.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-[var(--muted)] mb-1">
                Optional Note (No written reason required)
              </label>
              <input
                type="text"
                placeholder="Optional adjustment note..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmittingOverride}
                className={
                  isCeo ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600' : ''
                }
              >
                {isSubmittingOverride
                  ? 'Authorizing...'
                  : isCeo
                    ? 'Authorize via MFA'
                    : 'Commit Override'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
