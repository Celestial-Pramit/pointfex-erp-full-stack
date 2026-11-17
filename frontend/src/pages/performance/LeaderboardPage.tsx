import { useState, useEffect, useCallback, useMemo } from 'react'
import { Pin } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { erpApi } from '../../api/client'
import {
  PageHeader,
  Card,
  Tabs,
  Select,
  Input,
  Badge,
  DataTable,
  type DataTableColumn,
} from '../../components/common'

export function LeaderboardPage() {
  const { currentUser } = useApp()
  const [activeTab, setActiveTab] = useState<'lifetime_xp' | 'latest_week' | 'four_week_avg'>('lifetime_xp')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [squadFilter, setSquadFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [leaderboard, setLeaderboard] = useState<any[]>([])

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    try {
      const data = await erpApi.getLeaderboard({
        period: activeTab,
        role: roleFilter || undefined,
        squad: squadFilter || undefined,
      })
      setLeaderboard(Array.isArray(data) ? data : [])
    } catch {
      setLeaderboard([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, roleFilter, squadFilter])

  useEffect(() => {
    void fetchLeaderboard()
  }, [fetchLeaderboard])

  // Filter by search query if any
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return leaderboard
    const q = searchQuery.toLowerCase()
    return leaderboard.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.squad?.toLowerCase().includes(q),
    )
  }, [leaderboard, searchQuery])

  // Pinned user finding
  const currentUserRow = useMemo(() => {
    if (!currentUser?.id) return null
    return leaderboard.find((u) => u.userId === currentUser.id) || null
  }, [leaderboard, currentUser?.id])

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-500 font-black text-sm">
          🥇
        </span>
      )
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/30 text-slate-400 font-black text-sm">
          🥈
        </span>
      )
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-700 font-black text-sm">
          🥉
        </span>
      )
    }
    return (
      <span className="font-mono font-bold text-xs text-[var(--muted)] w-7 text-center inline-block">
        #{rank}
      </span>
    )
  }

  const columns: DataTableColumn<any>[] = [
    {
      key: 'rank',
      header: 'Rank',
      render: (r) => getRankBadge(r.rank),
      widthClass: 'w-16',
    },
    {
      key: 'name',
      header: 'Employee',
      render: (r) => {
        const isMe = r.userId === currentUser?.id
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--text)]">
              {r.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="font-bold text-xs text-[var(--text)] flex items-center gap-1.5">
                <span>{r.name}</span>
                {isMe && <Badge variant="info">You</Badge>}
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                {r.role} • <span className="font-medium text-[var(--text)]">{r.squad || 'Main Squad'}</span>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: 'score',
      header: activeTab === 'lifetime_xp' ? 'Lifetime Career XP' : 'KPI Score',
      align: 'right',
      render: (r) => {
        if (activeTab === 'lifetime_xp') {
          return (
            <div className="text-right font-mono font-bold text-xs text-amber-500">
              {Number(r.lifetimeXp || 0).toLocaleString()} XP
            </div>
          )
        }

        if (r.isInactive || r.kpiScore === null || r.kpiScore === undefined) {
          return (
            <span className="inline-block px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-extrabold text-[11px]">
              N/A
            </span>
          )
        }

        return (
          <div className="text-right font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
            {Number(r.kpiScore).toFixed(2)}
            {r.isProvisional && (
              <span className="ml-1 text-[10px] text-amber-500 font-normal">
                (Prov)
              </span>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pointfex Company Leaderboard"
        subtitle="Public engineering standings: Lifetime XP, Latest Weekly KPI, and 4-Week Moving Average."
      />

      {/* Tabs */}
      <Tabs
        activeId={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
        tabs={[
          { id: 'lifetime_xp', label: 'Lifetime XP' },
          { id: 'latest_week', label: 'Latest Week KPI' },
          { id: 'four_week_avg', label: '4-Week Average KPI' },
        ]}
      />

      {/* Filter and Search Bar */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search by employee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'developer', label: 'Developers' },
              { value: 'pm', label: 'Project Managers' },
              { value: 'cto', label: 'CTO' },
              { value: 'cpo', label: 'CPO' },
              { value: 'cfo', label: 'CFO' },
              { value: 'chro', label: 'CHRO' },
            ]}
          />

          <Select
            value={squadFilter}
            onChange={(e) => setSquadFilter(e.target.value)}
            options={[
              { value: '', label: 'All Squads' },
              { value: 'Core Platform', label: 'Core Platform' },
              { value: 'DevOps & Infra', label: 'DevOps & Infra' },
              { value: 'Enterprise Suite', label: 'Enterprise Suite' },
            ]}
          />
        </div>
      </Card>

      {/* Pinned Logged-In User Row if present */}
      {currentUserRow && (
        <Card className="border-[var(--primary)]/40 bg-[var(--primary-soft)]/20 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs font-bold text-[var(--primary)]">
                <Pin className="w-3.5 h-3.5" />
                Your Rank:
              </span>
              <div className="flex items-center gap-2">
                {getRankBadge(currentUserRow.rank)}
                <span className="font-bold text-xs text-[var(--text)]">{currentUserRow.name}</span>
                <span className="text-xs text-[var(--muted)]">({currentUserRow.role})</span>
              </div>
            </div>

            <div className="font-mono font-bold text-xs text-[var(--text)]">
              {activeTab === 'lifetime_xp'
                ? `${Number(currentUserRow.lifetimeXp || 0).toLocaleString()} XP`
                : currentUserRow.isInactive || currentUserRow.kpiScore === null
                  ? 'N/A'
                  : Number(currentUserRow.kpiScore).toFixed(2)}
            </div>
          </div>
        </Card>
      )}

      {/* Leaderboard Table */}
      <DataTable
        data={filteredRows}
        columns={columns}
        rowKey={(r) => r.userId}
        loading={loading}
        emptyTitle="No Leaderboard Data"
        emptyDescription="No employees match the selected leaderboard criteria."
      />
    </div>
  )
}
