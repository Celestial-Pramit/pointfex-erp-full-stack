import { useState, useMemo, useEffect, useCallback } from 'react'
import type React from 'react'
import {
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  ShieldAlert,
  Heart,
  TrendingUp,
  ChevronRight,
  Scale,
  AlertCircle,
} from 'lucide-react'
import { erpApi } from '../../api/client'
import { useExecutiveData } from '../../hooks/useExecutiveData'
import { useApp } from '../../context/AppContext'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'
import { Avatar } from '../../components/common/Avatar'
import { MoneyInput } from '../../components/common/MoneyInput'

export function ChroPerformancePage() {
  const {
    hrStats,
    performanceRecords,
    developers,
    projectManagers,
    teams,
    confidentialComplaints,
  } = useExecutiveData()

  const {
    recordPerformanceEvaluation,
    issueEmployeeRecognition,
    issueDisciplinaryAction,
    updateConfidentialComplaintStatus,
    showToast,
  } = useApp()

  // Tab State
  const [activeTab, setActiveTab] = useState<'roster' | 'squads' | 'grievances' | 'weight_queue'>('roster')

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'developer' | 'pm'>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')

  // Modals
  const [selectedStaffEval, setSelectedStaffEval] = useState<any>(null)
  const [evalScoreInput, setEvalScoreInput] = useState<number>(92)
  const [evalTierInput, setEvalTierInput] = useState<string>('top_performer')
  const [evalNotesInput, setEvalNotesInput] = useState('')
  const [evalStrengthsInput, setEvalStrengthsInput] = useState('High velocity, team player')
  const [evalImprovementsInput, setEvalImprovementsInput] = useState(
    'Cross-squad architecture sharing',
  )

  const [selectedStaffAction, setSelectedStaffAction] = useState<any>(null)
  const [actionCategory, setActionCategory] = useState<'recognition' | 'disciplinary'>(
    'recognition',
  )
  const [actionTitleInput, setActionTitleInput] = useState('')
  const [actionDescInput, setActionDescInput] = useState('')
  const [actionBonusPenaltyInput, setActionBonusPenaltyInput] = useState<number>(0)
  const [actionKpiDeductionInput, setActionKpiDeductionInput] = useState<number>(0)

  const [selectedComplaint, setSelectedComplaint] = useState<any>(null)
  const [complaintStatusInput, setComplaintStatusInput] = useState<string>('investigating')
  const [complaintMediationInput, setComplaintMediationInput] = useState('')

  // Task Weight Verification Gate State
  const [weightQueue, setWeightQueue] = useState<any[]>([])
  const [loadingWeightQueue, setLoadingWeightQueue] = useState(false)
  const [selectedWeightItem, setSelectedWeightItem] = useState<any>(null)
  const [approvedWeightInput, setApprovedWeightInput] = useState<number>(3)
  const [weightNotesInput, setWeightNotesInput] = useState('')
  const [verifyingWeight, setVerifyingWeight] = useState(false)

  const fetchWeightQueue = useCallback(async () => {
    setLoadingWeightQueue(true)
    try {
      const queue = await erpApi.getChroWeightQueue()
      if (Array.isArray(queue)) setWeightQueue(queue)
    } catch {
      // ignore
    } finally {
      setLoadingWeightQueue(false)
    }
  }, [])

  useEffect(() => {
    void fetchWeightQueue()
  }, [fetchWeightQueue])

  const handleVerifyWeight = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWeightItem) return
    setVerifyingWeight(true)
    try {
      await erpApi.verifyTaskWeight(selectedWeightItem.id, {
        approvedWeight: Number(approvedWeightInput),
        notes: weightNotesInput,
      })
      showToast('Task weight verified and locked successfully.', 'success')
      setSelectedWeightItem(null)
      void fetchWeightQueue()
    } catch (err: any) {
      showToast(err?.message || 'Failed to verify weight.', 'error')
    } finally {
      setVerifyingWeight(false)
    }
  }

  const handleQuickApproveWeight = async (item: any) => {
    try {
      await erpApi.verifyTaskWeight(item.id, {
        approvedWeight: Number(item.proposedWeight),
        notes: 'CHRO verified proposed weight directly',
      })
      showToast(`Weight ${item.proposedWeight} approved for ${item.task?.title || 'task'}.`, 'success')
      void fetchWeightQueue()
    } catch (err: any) {
      showToast(err?.message || 'Failed to approve weight.', 'error')
    }
  }

  const handleConsensusVote = async (verificationId: string, decision: 'APPROVE' | 'REJECT') => {
    try {
      await erpApi.castConsensusVote(verificationId, {
        decision,
        notes: 'C-Level consensus vote cast via HR portal',
      })
      showToast(`Consensus vote (${decision}) recorded.`, 'success')
      void fetchWeightQueue()
    } catch (err: any) {
      showToast(err?.message || 'Failed to record consensus vote.', 'error')
    }
  }

  // Combined staff roster with performance details
  const staffRoster = useMemo(() => {
    const all = [...projectManagers, ...developers]
    return all.map((user) => {
      const perf = performanceRecords.find((r) => r.userId === user.id || r.developerId === user.id)
      const userTeam = teams.find((t) => t.id === user.teamId)
      return {
        user,
        perf: perf || {
          userId: user.id,
          developerId: user.id,
          overallScore: 88,
          deliverySpeed: 87,
          codeQuality: 89,
          reliability: 90,
          collaboration: 91,
          attendanceRate: 96,
          satisfactionIndex: 4.6,
          performanceTier: 'strong_contributor' as const,
          evaluationNotes: 'Standard quarterly performance baseline established.',
          lastEvaluationDate: '2026-11-01',
          strengths: ['Consistent velocity'],
          improvements: ['Documentation'],
        },
        team: userTeam,
      }
    })
  }, [projectManagers, developers, performanceRecords, teams])

  // Filtered staff roster
  const filteredRoster = useMemo(() => {
    return staffRoster.filter(({ user, perf }) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false
      if (tierFilter !== 'all' && perf.performanceTier !== tierFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          user.name.toLowerCase().includes(q) ||
          user.title.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [staffRoster, roleFilter, tierFilter, searchQuery])

  // Open Evaluation Modal
  const handleOpenEvaluation = (staffItem: any) => {
    setSelectedStaffEval(staffItem)
    setEvalScoreInput(staffItem.perf.overallScore)
    setEvalTierInput(staffItem.perf.performanceTier || 'strong_contributor')
    setEvalNotesInput(staffItem.perf.evaluationNotes || '')
    setEvalStrengthsInput(staffItem.perf.strengths?.join(', ') || 'High velocity, team player')
    setEvalImprovementsInput(staffItem.perf.improvements?.join(', ') || 'Cross-squad documentation')
  }

  const handleSaveEvaluation = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaffEval) return
    recordPerformanceEvaluation(selectedStaffEval.user.id, {
      score: Number(evalScoreInput),
      tier: evalTierInput,
      notes: evalNotesInput,
      strengths: evalStrengthsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      improvementAreas: evalImprovementsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    })
    setSelectedStaffEval(null)
  }

  // Open Action Modal (Recognition / Disciplinary)
  const handleOpenAction = (staffItem: any, initialType: 'recognition' | 'disciplinary') => {
    setSelectedStaffAction(staffItem)
    setActionCategory(initialType)
    setActionTitleInput(
      initialType === 'recognition'
        ? 'Excellence in Sprint Execution'
        : 'Notice of Code Review SLA Breach',
    )
    setActionDescInput(
      initialType === 'recognition'
        ? 'Consistently delivered flawless milestones with exceptional proactive collaboration.'
        : 'Repeated delays exceeding the 48-hour SLA for mandatory PR reviews.',
    )
    setActionBonusPenaltyInput(initialType === 'recognition' ? 300 : 150)
    setActionKpiDeductionInput(initialType === 'disciplinary' ? 5 : 0)
  }

  const handleSaveAction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaffAction) return
    if (actionCategory === 'recognition') {
      issueEmployeeRecognition(
        selectedStaffAction.user.id,
        actionTitleInput,
        actionDescInput,
        actionBonusPenaltyInput > 0 ? Number(actionBonusPenaltyInput) : undefined,
      )
    } else {
      issueDisciplinaryAction(
        selectedStaffAction.user.id,
        actionTitleInput,
        actionDescInput,
        actionBonusPenaltyInput > 0 ? Number(actionBonusPenaltyInput) : undefined,
      )
      if (actionKpiDeductionInput > 0) {
        void erpApi
          .applyDisciplinaryDeduction({
            employeeId: selectedStaffAction.user.id,
            deductionPoints: Number(actionKpiDeductionInput),
            reason: `${actionTitleInput}: ${actionDescInput}`,
          })
          .then(() => {
            showToast(`Deducted ${actionKpiDeductionInput} KPI points with cryptographic audit trail.`, 'info')
          })
          .catch((err) => {
            showToast(err?.message || 'Failed to deduct KPI points', 'error')
          })
      }
    }
    setSelectedStaffAction(null)
  }

  // Open Adjudicate Grievance Modal
  const handleOpenGrievance = (complaint: any) => {
    setSelectedComplaint(complaint)
    setComplaintStatusInput(complaint.status || 'investigating')
    setComplaintMediationInput(complaint.mediationNotes || '')
  }

  const handleSaveGrievance = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedComplaint) return
    updateConfidentialComplaintStatus(
      selectedComplaint.id,
      complaintStatusInput,
      complaintMediationInput,
    )
    setSelectedComplaint(null)
  }

  return (
    <div className="space-y-6">
      {/* Top HR Health Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Performance Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Avg Performance
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {hrStats.avgPerformanceScore}%
          </div>
          <p className="text-[11px] text-sky-600 dark:text-sky-400 mt-1 font-medium">
            30 Monitored Staff
          </p>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Attendance Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {hrStats.avgAttendanceRate}%
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            Daily Standup Compliance
          </p>
        </div>

        {/* Squad Morale Index */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Squad Morale
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {hrStats.avgSatisfactionIndex} / 5.0
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Pulse Survey Health</p>
        </div>

        {/* On-Time Delivery */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              On-Time Delivery
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {hrStats.onTimeDeliveryRate}%
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Sprint Milestone Cadence
          </p>
        </div>

        {/* Confidential Grievances */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Confidential Desk
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {confidentialComplaints.length}
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
            CHRO / CEO Restricted
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'roster'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Staff Evaluations Roster ({staffRoster.length})
            </button>
            <button
              onClick={() => setActiveTab('squads')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'squads'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Squad Dynamics & Morale ({teams.length})
            </button>
            <button
              onClick={() => setActiveTab('grievances')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'grievances'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Confidential Grievance Desk
              {confidentialComplaints.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {confidentialComplaints.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('weight_queue')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'weight_queue'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Scale className="w-4 h-4 text-amber-500" />
              Weight Verification Gate
              {weightQueue.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
                  {weightQueue.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* TAB 1: EVALUATIONS ROSTER */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search employee by name, title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="developer">Developers (24)</option>
                  <option value="pm">Project Managers (6)</option>
                </select>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="all">All Tiers</option>
                  <option value="top_performer">Top Performers</option>
                  <option value="strong_contributor">Strong Contributors</option>
                  <option value="needs_support">Needs Support</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Showing{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {filteredRoster.length}
                </span>{' '}
                staff members
              </div>
            </div>

            {/* Roster Table */}
            <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Squad</th>
                    <th className="py-3.5 px-4">Score</th>
                    <th className="py-3.5 px-4">Speed / Quality</th>
                    <th className="py-3.5 px-4">Attendance</th>
                    <th className="py-3.5 px-4">Morale</th>
                    <th className="py-3.5 px-4">Tier Status</th>
                    <th className="py-3.5 px-4 text-right">HR Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRoster.map(({ user, perf, team }) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={user.avatarUrl || user.avatar}
                            name={user.name}
                            initials={user.initials}
                            size="md"
                            className="border border-slate-200 dark:border-slate-700"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {user.name}
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {user.role}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400">{user.title}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {team?.name || 'Assigned Squad'}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {team?.code || 'SQ-01'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                            perf.overallScore >= 92
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : perf.overallScore >= 80
                                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}
                        >
                          {perf.overallScore}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                        <div>
                          Speed: <span className="font-semibold">{perf.deliverySpeed}%</span>
                        </div>
                        <div>
                          Quality: <span className="font-semibold">{perf.codeQuality}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {perf.attendanceRate || 96}%
                      </td>
                      <td className="py-3.5 px-4 font-medium text-rose-600 dark:text-rose-400">
                        {perf.satisfactionIndex || 4.7} / 5.0
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            perf.performanceTier === 'top_performer'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : perf.performanceTier === 'needs_support'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                          }`}
                        >
                          {(perf.performanceTier || 'strong_contributor').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEvaluation({ user, perf, team })}
                          >
                            Evaluate
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                            onClick={() => handleOpenAction({ user, perf, team }, 'recognition')}
                          >
                            Award
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                            onClick={() => handleOpenAction({ user, perf, team }, 'disciplinary')}
                          >
                            Discipline
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRoster.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                        No personnel performance records match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SQUAD MORALE & ATTENDANCE MATRIX */}
        {activeTab === 'squads' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teams.map((team) => {
              const squadDevs = staffRoster.filter(
                (s) => s.user.teamId === team.id && s.user.role === 'developer',
              )
              const avgScore =
                squadDevs.length > 0
                  ? Math.round(
                      squadDevs.reduce((sum, s) => sum + s.perf.overallScore, 0) / squadDevs.length,
                    )
                  : 90
              const avgAttendance =
                squadDevs.length > 0
                  ? Math.round(
                      squadDevs.reduce((sum, s) => sum + (s.perf.attendanceRate || 95), 0) /
                        squadDevs.length,
                    )
                  : 96
              const avgMorale =
                squadDevs.length > 0
                  ? (
                      squadDevs.reduce((sum, s) => sum + (s.perf.satisfactionIndex || 4.7), 0) /
                      squadDevs.length
                    ).toFixed(1)
                  : '4.8'

              return (
                <div
                  key={team.id}
                  className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {team.name}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono">{team.code}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Healthy
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 mb-4 space-y-1">
                      <div>
                        Squad PM:{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {team.pm?.name || 'Alex Rivera'}
                        </span>
                      </div>
                      <div>
                        Lead Dev:{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {team.leadDev?.name || 'Marcus Brody'}
                        </span>
                      </div>
                      <div>
                        Staff Count:{' '}
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {squadDevs.length + 1} members
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 mb-4 text-center">
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-400">
                          Perf Score
                        </div>
                        <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                          {avgScore}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-400">
                          Attendance
                        </div>
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {avgAttendance}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-400">
                          Morale
                        </div>
                        <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                          {avgMorale} / 5
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Weekly Retrospective Complete</span>
                    <button
                      onClick={() => {
                        setRoleFilter('developer')
                        setActiveTab('roster')
                      }}
                      className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      View Members <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB 3: CONFIDENTIAL GRIEVANCE DESK */}
        {activeTab === 'grievances' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Privileged C-Suite Whistleblower & Grievance Repository
                </h4>
                <p className="text-xs text-purple-700/80 dark:text-purple-400/80 mt-0.5">
                  Restricted strictly to the Chief Human Resources Officer and Chief Executive
                  Officer. Invisible to PMs and CTO.
                </p>
              </div>
            </div>

            {confidentialComplaints.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                  Grievance Desk Clear
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  No open confidential complaints or whistleblower filings requiring adjudication.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {confidentialComplaints.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                          CONFIDENTIAL
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{c.id}</span>
                        <span className="text-xs text-slate-400">• {c.date}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            c.status === 'resolved'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                        {c.title}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                        {c.description}
                      </p>
                      {c.mediationNotes && (
                        <div className="text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            HR Mediation Notes:{' '}
                          </span>
                          {c.mediationNotes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => handleOpenGrievance(c)}
                      >
                        Adjudicate Grievance
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Task Weight Verification Gate */}
        {activeTab === 'weight_queue' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    CHRO Task Weight Verification Gate
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    PMs propose weights; the CHRO holds final authority to verify, modify, or reject. Tasks yield exactly 10x XP.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void fetchWeightQueue()}
                disabled={loadingWeightQueue}
              >
                {loadingWeightQueue ? 'Refreshing...' : 'Refresh Queue'}
              </Button>
            </div>

            {weightQueue.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                  Verification Queue Clear
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  All proposed task and milestone weights have been verified and locked.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                {weightQueue.map((item) => {
                  const weight = Number(item.approvedWeight || item.proposedWeight)
                  const xpYield = weight * 10
                  const isMassive = item.isMassiveXp || weight >= 50
                  const isPending = item.status === 'PENDING_CHRO'

                  return (
                    <div
                      key={item.id}
                      className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isPending
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {item.status.replace('_', ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                            Category: {item.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Context: {item.context.replace('_', ' ')}
                          </span>
                          {isMassive && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Massive XP ({xpYield} XP)
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.task?.title || item.milestone?.title || 'Untitled Deliverable'}
                        </h4>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span>
                            Project:{' '}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {item.task?.project?.name || item.milestone?.project?.name || 'General'}
                            </strong>
                          </span>
                          <span>
                            Proposed by:{' '}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {item.proposer?.name || 'Project Manager'}
                            </strong>
                          </span>
                          <span>
                            Assignee:{' '}
                            <strong className="text-slate-700 dark:text-slate-300">
                              {item.task?.assignee?.name || 'Unassigned'}
                            </strong>
                          </span>
                          <span>
                            Proposed Weight: <strong className="text-amber-600">{item.proposedWeight}</strong>
                          </span>
                          <span>
                            XP Yield: <strong className="text-indigo-600">{xpYield} XP</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                        {isMassive && item.massiveXpFrozen && (
                          <div className="flex items-center gap-1.5 mr-2">
                            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                              {item.consensusVotes?.filter((v: any) => v.decision === 'APPROVE').length || 0}/2 Approvals:
                            </span>
                            <Button
                              variant="secondary"
                              size="xs"
                              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 text-[11px]"
                              onClick={() => void handleConsensusVote(item.id, 'APPROVE')}
                            >
                              Vote Approve
                            </Button>
                            <Button
                              variant="secondary"
                              size="xs"
                              className="text-rose-600 border-rose-300 hover:bg-rose-50 text-[11px]"
                              onClick={() => void handleConsensusVote(item.id, 'REJECT')}
                            >
                              Vote Reject
                            </Button>
                          </div>
                        )}
                        {isPending && (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => void handleQuickApproveWeight(item)}
                          >
                            Quick Approve
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => {
                            setSelectedWeightItem(item)
                            setApprovedWeightInput(Number(item.proposedWeight))
                            setWeightNotesInput(item.chroNotes || '')
                          }}
                        >
                          Modify / Verify Weight
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Record Evaluation */}
      {selectedStaffEval && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStaffEval(null)}
          title={`Performance Evaluation: ${selectedStaffEval.user.name}`}
        >
          <form onSubmit={handleSaveEvaluation} className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <Avatar
                src={selectedStaffEval.user.avatarUrl || selectedStaffEval.user.avatar}
                name={selectedStaffEval.user.name}
                initials={selectedStaffEval.user.initials}
                className="w-10 h-10 text-sm"
              />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {selectedStaffEval.user.name}
                </div>
                <div className="text-xs text-slate-500">
                  {selectedStaffEval.user.title} — {selectedStaffEval.team?.name}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Overall Score (0-100%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={evalScoreInput}
                  onChange={(e) => setEvalScoreInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Performance Tier
                </label>
                <select
                  value={evalTierInput}
                  onChange={(e) => setEvalTierInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="top_performer">Top Performer</option>
                  <option value="strong_contributor">Strong Contributor</option>
                  <option value="needs_support">Needs Support</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Evaluation Notes & Observations
              </label>
              <textarea
                rows={3}
                placeholder="Comprehensive evaluation summary..."
                value={evalNotesInput}
                onChange={(e) => setEvalNotesInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Key Strengths (comma-separated)
              </label>
              <input
                type="text"
                value={evalStrengthsInput}
                onChange={(e) => setEvalStrengthsInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Areas for Development (comma-separated)
              </label>
              <input
                type="text"
                value={evalImprovementsInput}
                onChange={(e) => setEvalImprovementsInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button variant="secondary" onClick={() => setSelectedStaffEval(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Record Evaluation
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Award / Disciplinary Action */}
      {selectedStaffAction && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStaffAction(null)}
          title={
            actionCategory === 'recognition'
              ? `Issue Employee Recognition: ${selectedStaffAction.user.name}`
              : `Issue Disciplinary Action: ${selectedStaffAction.user.name}`
          }
        >
          <form onSubmit={handleSaveAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActionCategory('recognition')}
                className={`py-2 px-3 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                  actionCategory === 'recognition'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Recognition Award
              </button>
              <button
                type="button"
                onClick={() => setActionCategory('disciplinary')}
                className={`py-2 px-3 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                  actionCategory === 'disciplinary'
                    ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Formal Disciplinary Action
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Notice Title / Citation
              </label>
              <input
                type="text"
                value={actionTitleInput}
                onChange={(e) => setActionTitleInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Formal Justification & Documentation
              </label>
              <textarea
                rows={3}
                value={actionDescInput}
                onChange={(e) => setActionDescInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <MoneyInput
              label={
                actionCategory === 'recognition'
                  ? 'Discretionary Bonus (BDT, Optional)'
                  : 'Financial Penalty (BDT, Optional)'
              }
              min={0}
              value={actionBonusPenaltyInput}
              onChangeDigits={(val) => setActionBonusPenaltyInput(val)}
              hint="Leave as 0 for non-monetary citation. Non-zero amounts adjust the employee wallet."
            />

            {actionCategory === 'disciplinary' && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  KPI Percentage Deduction (Pointfex HR Policy: 1–100 Pts)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={actionKpiDeductionInput}
                  onChange={(e) => setActionKpiDeductionInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-sm font-bold text-rose-700 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Directly reduces active weekly KPI score with an immutable, cryptographic audit log.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button variant="secondary" onClick={() => setSelectedStaffAction(null)}>
                Cancel
              </Button>
              <Button
                variant={actionCategory === 'recognition' ? 'primary' : 'danger'}
                type="submit"
                className={
                  actionCategory === 'recognition'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : ''
                }
              >
                {actionCategory === 'recognition'
                  ? 'Award Recognition'
                  : 'Record Disciplinary Action'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Adjudicate Grievance */}
      {selectedComplaint && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedComplaint(null)}
          title="Adjudicate Confidential Grievance"
        >
          <form onSubmit={handleSaveGrievance} className="space-y-4">
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900">
              <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                Grievance Title
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {selectedComplaint.title}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Adjudication Status
              </label>
              <select
                value={complaintStatusInput}
                onChange={(e) => setComplaintStatusInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="under_review">Under Review</option>
                <option value="investigating">Active Investigation</option>
                <option value="resolved">Resolved & Closed</option>
                <option value="dismissed">Dismissed (No Action Required)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Confidential HR Mediation Notes
              </label>
              <textarea
                rows={4}
                placeholder="Document executive findings, restorative mediation steps, or corrective plans..."
                value={complaintMediationInput}
                onChange={(e) => setComplaintMediationInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button variant="secondary" onClick={() => setSelectedComplaint(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Save HR Resolution
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: Verify / Modify Task Weight & XP Yield */}
      {selectedWeightItem && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedWeightItem(null)}
          title="Verify Task Weight & XP Yield"
        >
          <form onSubmit={handleVerifyWeight} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Deliverable
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {selectedWeightItem.task?.title || selectedWeightItem.milestone?.title || 'Task'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Proposed Weight: {selectedWeightItem.proposedWeight} (Yields{' '}
                {Number(selectedWeightItem.proposedWeight) * 10} XP)
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Approved Task Weight (1–100)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                step={0.5}
                required
                value={approvedWeightInput}
                onChange={(e) => setApprovedWeightInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-bold text-slate-900 dark:text-white"
              />
              <p className="text-xs text-indigo-600 mt-1">
                Will disburse: <strong>{approvedWeightInput * 10} XP</strong> upon completion.
                {approvedWeightInput >= 50 && ' (Triggering Massive XP Consensus Lock)'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                CHRO Verification Notes & Justification
              </label>
              <textarea
                rows={3}
                placeholder="Reason for weight approval or adjustment..."
                value={weightNotesInput}
                onChange={(e) => setWeightNotesInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button variant="secondary" onClick={() => setSelectedWeightItem(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={verifyingWeight}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {verifyingWeight ? 'Verifying...' : 'Lock Approved Weight'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
