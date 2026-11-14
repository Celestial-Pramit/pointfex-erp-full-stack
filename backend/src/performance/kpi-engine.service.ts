import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { AuthenticatedUser } from '../common/auth-user.interface'
import { Prisma } from '@prisma/client'
import * as crypto from 'crypto'

export interface DeveloperTaskMetric {
  taskId: string
  title: string
  grade: number
  weight: number
  contextMultiplier: number // 1.0, 0.7, 0.5
}

@Injectable()
export class KpiEngineService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // 1. DEVELOPER (LEVEL 1) WEEKLY KPI CALCULATION
  // --------------------------------------------------------------------------
  async calculateDeveloperWeeklyKpi(
    employeeId: string,
    weekNumber: number,
    year: number,
    actor?: AuthenticatedUser,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        assignedTasks: {
          where: {
            status: 'completed',
            updatedAt: {
              gte: this.getWeekStartDate(weekNumber, year),
              lte: this.getWeekEndDate(weekNumber, year),
            },
          },
          include: {
            weightVerification: true,
            project: {
              include: {
                teamProjects: true,
              },
            },
          },
        },
      },
    })

    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`)

    // Check if 0 tasks completed -> Inactivity N/A Red Flag
    const completedTasks = employee.assignedTasks
    if (completedTasks.length === 0) {
      return this.recordInactivityKpi(employeeId, weekNumber, year, 1)
    }

    // Calculate TaskPerformanceScore = Σ(G_i × W_i × M_i) / Σ(W_i × M_i)
    let totalWeightedScore = 0
    let totalWeightMultiplier = 0
    const taskBreakdowns: DeveloperTaskMetric[] = []

    for (const task of completedTasks) {
      const weight = task.weightVerification?.approvedWeight
        ? Number(task.weightVerification.approvedWeight)
        : task.weightVerification?.proposedWeight
          ? Number(task.weightVerification.proposedWeight)
          : 3 // Default medium

      // Context multiplier (1.0 main squad, 0.7 outside squad, 0.5 executive direct)
      let multiplier = 1.0
      if (task.weightVerification?.context === 'OUTSIDE_SQUAD') {
        multiplier = 0.7
      } else if (task.weightVerification?.context === 'DIRECT_EXECUTIVE') {
        multiplier = 0.5
      }

      // Default baseline grade is 90 if not explicitly graded
      const grade = 90
      totalWeightedScore += grade * weight * multiplier
      totalWeightMultiplier += weight * multiplier

      taskBreakdowns.push({
        taskId: task.id,
        title: task.title,
        grade,
        weight,
        contextMultiplier: multiplier,
      })
    }

    const pmScore =
      totalWeightMultiplier > 0
        ? Math.min(100, Math.max(0, totalWeightedScore / totalWeightMultiplier))
        : 85

    // Executive Read-Receipt Policy: Auto-fill CTO (15%), CPO (15%), CFO (10%), CHRO (10%)
    // matching PM's 50% score as provisional draft.
    const ctoScore = pmScore
    const cpoScore = pmScore
    const cfoScore = pmScore
    const chroScore = pmScore

    // Check for Return-from-Inactivity Penalty (10% deduction on next evaluated task / cycle)
    const pendingPenaltyRecord = await this.prisma.weeklyKpiRecord.findFirst({
      where: {
        employeeId,
        inactivityPenaltyPending: true,
      },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    })

    let returnPenaltyApplied = false
    let baseCalculatedScore =
      pmScore * 0.5 + ctoScore * 0.15 + cpoScore * 0.15 + cfoScore * 0.1 + chroScore * 0.1
    let finalScore = baseCalculatedScore

    if (pendingPenaltyRecord) {
      finalScore = Math.max(0, finalScore - 10)
      returnPenaltyApplied = true
      await this.prisma.weeklyKpiRecord.update({
        where: { id: pendingPenaltyRecord.id },
        data: {
          inactivityPenaltyPending: false,
          inactivityPenaltyApplied: true,
        },
      })
    }

    const existingRecord = await this.prisma.weeklyKpiRecord.findUnique({
      where: {
        employeeId_year_weekNumber: {
          employeeId,
          year,
          weekNumber,
        },
      },
    })

    const evaluationBreakdown = {
      roleLevel: 1,
      roleName: 'Developer',
      tasksCompletedCount: completedTasks.length,
      taskMetrics: taskBreakdowns,
      formula: '50% PM + 15% CTO + 15% CPO + 10% CFO + 10% CHRO',
      returnPenaltyApplied,
      returnPenaltyDeduction: returnPenaltyApplied ? 10 : 0,
      baseCalculatedScore,
      provisionalAutoFilled: true,
      executiveSignoffs: {
        cto: { status: 'PROVISIONAL', confirmedAt: null },
        cpo: { status: 'PROVISIONAL', confirmedAt: null },
        cfo: { status: 'PROVISIONAL', confirmedAt: null },
        chro: { status: 'PROVISIONAL', confirmedAt: null },
      },
    }

    const record = await this.prisma.weeklyKpiRecord.upsert({
      where: {
        employeeId_year_weekNumber: {
          employeeId,
          year,
          weekNumber,
        },
      },
      update: {
        score: new Prisma.Decimal(finalScore.toFixed(2)),
        isInactive: false,
        pmScore: new Prisma.Decimal(pmScore.toFixed(2)),
        ctoScore: new Prisma.Decimal(ctoScore.toFixed(2)),
        cpoScore: new Prisma.Decimal(cpoScore.toFixed(2)),
        cfoScore: new Prisma.Decimal(cfoScore.toFixed(2)),
        chroScore: new Prisma.Decimal(chroScore.toFixed(2)),
        evaluationBreakdown: evaluationBreakdown as any,
        updatedAt: new Date(),
      },
      create: {
        employeeId,
        weekNumber,
        year,
        score: new Prisma.Decimal(finalScore.toFixed(2)),
        isInactive: false,
        roleLevel: 1,
        evaluationStatus: 'PROVISIONAL',
        pmScore: new Prisma.Decimal(pmScore.toFixed(2)),
        ctoScore: new Prisma.Decimal(ctoScore.toFixed(2)),
        cpoScore: new Prisma.Decimal(cpoScore.toFixed(2)),
        cfoScore: new Prisma.Decimal(cfoScore.toFixed(2)),
        chroScore: new Prisma.Decimal(chroScore.toFixed(2)),
        evaluationBreakdown: evaluationBreakdown as any,
      },
    })

    // Log to immutable audit ledger
    await this.appendKpiAuditLog({
      employeeId,
      metricType: 'KPI',
      deltaValue: new Prisma.Decimal(finalScore.toFixed(2)),
      resultingTotal: new Prisma.Decimal(finalScore.toFixed(2)),
      actionType: 'WEEKLY_KPI_FINAL',
      triggerEvent: `Week ${weekNumber} (${year}) Developer Evaluation Finalized`,
      authorizedById: actor?.id || null,
      authorizedRole: actor?.role?.toUpperCase() || 'SYSTEM',
      reason: 'Automated weekly evaluation calculation',
    })

    return record
  }

  // --------------------------------------------------------------------------
  // 2. PROJECT MANAGER (LEVEL 2) WEEKLY KPI CALCULATION
  // --------------------------------------------------------------------------
  async calculatePmWeeklyKpi(
    employeeId: string,
    weekNumber: number,
    year: number,
    ratings?: {
      ctoScore?: number
      cpoScore?: number
      cfoScore?: number
      chroScore?: number
      notes?: string
    },
    actor?: AuthenticatedUser,
  ) {
    const cto = ratings?.ctoScore ?? 88
    const cpo = ratings?.cpoScore ?? 88
    const cfo = ratings?.cfoScore ?? 85
    const chro = ratings?.chroScore ?? 90

    // 30% CTO + 30% CPO + 20% CFO + 20% CHRO = 100%
    const baseScore = cto * 0.3 + cpo * 0.3 + cfo * 0.2 + chro * 0.2

    // Check for Return-from-Inactivity Penalty (10% deduction on next evaluated cycle)
    const pendingPenaltyRecord = await this.prisma.weeklyKpiRecord.findFirst({
      where: {
        employeeId,
        inactivityPenaltyPending: true,
      },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    })

    let returnPenaltyApplied = false
    let finalScore = baseScore
    if (pendingPenaltyRecord) {
      finalScore = Math.max(0, finalScore - 10)
      returnPenaltyApplied = true
      await this.prisma.weeklyKpiRecord.update({
        where: { id: pendingPenaltyRecord.id },
        data: {
          inactivityPenaltyPending: false,
          inactivityPenaltyApplied: true,
        },
      })
    }

    const breakdown = {
      roleLevel: 2,
      roleName: 'Project Manager',
      formula: '30% CTO + 30% CPO + 20% CFO + 20% CHRO',
      ratings: { cto, cpo, cfo, chro },
      baseScore,
      returnPenaltyApplied,
      returnPenaltyDeduction: returnPenaltyApplied ? 10 : 0,
      notes: ratings?.notes || 'Weekly PM squad performance evaluation',
    }

    const record = await this.prisma.weeklyKpiRecord.upsert({
      where: {
        employeeId_year_weekNumber: {
          employeeId,
          year,
          weekNumber,
        },
      },
      update: {
        score: new Prisma.Decimal(finalScore.toFixed(2)),
        isInactive: false,
        pmScore: null,
        ctoScore: new Prisma.Decimal(cto.toFixed(2)),
        cpoScore: new Prisma.Decimal(cpo.toFixed(2)),
        cfoScore: new Prisma.Decimal(cfo.toFixed(2)),
        chroScore: new Prisma.Decimal(chro.toFixed(2)),
        evaluationStatus: 'CONFIRMED',
        evaluationBreakdown: breakdown as any,
        updatedAt: new Date(),
      },
      create: {
        employeeId,
        weekNumber,
        year,
        score: new Prisma.Decimal(finalScore.toFixed(2)),
        isInactive: false,
        roleLevel: 2,
        evaluationStatus: 'CONFIRMED',
        ctoScore: new Prisma.Decimal(cto.toFixed(2)),
        cpoScore: new Prisma.Decimal(cpo.toFixed(2)),
        cfoScore: new Prisma.Decimal(cfo.toFixed(2)),
        chroScore: new Prisma.Decimal(chro.toFixed(2)),
        evaluationBreakdown: breakdown as any,
      },
    })

    await this.appendKpiAuditLog({
      employeeId,
      metricType: 'KPI',
      deltaValue: new Prisma.Decimal(finalScore.toFixed(2)),
      resultingTotal: new Prisma.Decimal(finalScore.toFixed(2)),
      actionType: 'WEEKLY_KPI_FINAL',
      triggerEvent: `Week ${weekNumber} PM Performance Evaluation`,
      authorizedById: actor?.id || null,
      authorizedRole: actor?.role?.toUpperCase() || 'C_LEVEL',
      reason: ratings?.notes || 'C-Level PM assessment',
    })

    return record
  }

  // --------------------------------------------------------------------------
  // 3. C-LEVEL (LEVEL 3) & CEO (LEVEL 4) WEEKLY KPI
  // --------------------------------------------------------------------------
  async calculateCLevelWeeklyKpi(
    employeeId: string,
    roleTitle: 'CTO' | 'CPO' | 'CFO' | 'CHRO',
    weekNumber: number,
    year: number,
    macroGoals: number = 90,
    ceoDirectReview: number = 90,
    peerSynergy: number = 88,
  ) {
    // 30% Domain Execution: average of squad KPIs
    const pmKpis = await this.prisma.weeklyKpiRecord.findMany({
      where: {
        roleLevel: 2,
        weekNumber,
        year,
        isInactive: false,
      },
      select: { score: true },
    })

    const domainExecutionAvg =
      pmKpis.length > 0
        ? pmKpis.reduce((acc, curr) => acc + Number(curr.score || 0), 0) / pmKpis.length
        : 85

    // 40% Macro + 30% Domain + 20% CEO + 10% Peer = 100%
    const finalScore =
      macroGoals * 0.4 + domainExecutionAvg * 0.3 + ceoDirectReview * 0.2 + peerSynergy * 0.1

    const breakdown = {
      roleLevel: 3,
      roleName: roleTitle,
      formula: '40% Macro Goals + 30% Domain Avg + 20% CEO Review + 10% Peer Synergy',
      macroGoals,
      domainExecutionAvg,
      ceoDirectReview,
      peerSynergy,
    }

    return this.prisma.weeklyKpiRecord.upsert({
      where: {
        employeeId_year_weekNumber: {
          employeeId,
          year,
          weekNumber,
        },
      },
      update: {
        score: new Prisma.Decimal(finalScore.toFixed(2)),
        isInactive: false,
        evaluationStatus: 'CONFIRMED',
        evaluationBreakdown: breakdown as any,
      },
      create: {
        employeeId,
        weekNumber,
        year,
        score: new Prisma.Decimal(finalScore.toFixed(2)),
        roleLevel: 3,
        evaluationStatus: 'CONFIRMED',
        evaluationBreakdown: breakdown as any,
      },
    })
  }

  async calculateCeoWeeklyKpi(
    ceoEmployeeId: string,
    weekNumber: number,
    year: number,
    companyPerformanceScore: number = 92,
  ) {
    // 40% C-Level Aggregate: Average of CTO, CPO, CFO, CHRO weekly KPIs
    const cLevelRecords = await this.prisma.weeklyKpiRecord.findMany({
      where: {
        roleLevel: 3,
        weekNumber,
        year,
        isInactive: false,
      },
      select: { score: true },
    })

    const cLevelAggregate =
      cLevelRecords.length > 0
        ? cLevelRecords.reduce((acc, curr) => acc + Number(curr.score || 0), 0) /
          cLevelRecords.length
        : 88

    // 60% Company Performance + 40% C-Level Aggregate = 100%
    const finalScore = companyPerformanceScore * 0.6 + cLevelAggregate * 0.4

    return this.prisma.weeklyKpiRecord.upsert({
      where: {
        employeeId_year_weekNumber: {
          employeeId: ceoEmployeeId,
          year,
          weekNumber,
        },
      },
      update: {
        score: new Prisma.Decimal(finalScore.toFixed(2)),
        isInactive: false,
        evaluationStatus: 'CONFIRMED',
        evaluationBreakdown: {
          roleLevel: 4,
          roleName: 'CEO',
          formula: '60% Company Performance + 40% C-Level Aggregate',
          companyPerformanceScore,
          cLevelAggregate,
        } as any,
      },
      create: {
        employeeId: ceoEmployeeId,
        weekNumber,
        year,
        score: new Prisma.Decimal(finalScore.toFixed(2)),
        roleLevel: 4,
        evaluationStatus: 'CONFIRMED',
        evaluationBreakdown: {
          roleLevel: 4,
          roleName: 'CEO',
          formula: '60% Company Performance + 40% C-Level Aggregate',
          companyPerformanceScore,
          cLevelAggregate,
        } as any,
      },
    })
  }

  // --------------------------------------------------------------------------
  // 4. INACTIVITY DETECTION (N/A RED FLAG) & PENALTY ENFORCEMENT
  // --------------------------------------------------------------------------
  async recordInactivityKpi(
    employeeId: string,
    weekNumber: number,
    year: number,
    roleLevel: number = 1,
  ) {
    const breakdown = {
      roleLevel,
      status: 'N/A',
      reason: 'Inactivity: Zero tasks/milestones completed during the weekly cycle',
      inactivityPenaltyApplied: true,
      penaltyRule: '10% deduction on next evaluated task',
    }

    const record = await this.prisma.weeklyKpiRecord.upsert({
      where: {
        employeeId_year_weekNumber: {
          employeeId,
          year,
          weekNumber,
        },
      },
      update: {
        score: null, // Null indicates N/A Red Flag
        isInactive: true,
        inactivityPenaltyPending: true,
        evaluationStatus: 'CONFIRMED',
        evaluationBreakdown: breakdown as any,
      },
      create: {
        employeeId,
        weekNumber,
        year,
        score: null,
        isInactive: true,
        inactivityPenaltyPending: true,
        roleLevel,
        evaluationStatus: 'CONFIRMED',
        evaluationBreakdown: breakdown as any,
      },
    })

    await this.appendKpiAuditLog({
      employeeId,
      metricType: 'KPI',
      deltaValue: new Prisma.Decimal(0),
      resultingTotal: null,
      actionType: 'INACTIVITY_PENALTY',
      triggerEvent: `Week ${weekNumber} Zero Activity Inactivity Flag`,
      authorizedById: null,
      authorizedRole: 'SYSTEM',
      reason: 'Flagged N/A Red Flag; 10% penalty pending on next task',
    })

    return record
  }

  // --------------------------------------------------------------------------
  // 5. CHRO DISCIPLINARY DEDUCTION (WITH AUDIT)
  // --------------------------------------------------------------------------
  async applyDisciplinaryDeduction(
    employeeId: string,
    deductionPoints: number,
    reason: string,
    chroActor: AuthenticatedUser,
  ) {
    if (deductionPoints <= 0 || deductionPoints > 100) {
      throw new BadRequestException('Deduction points must be between 1 and 100')
    }

    const latestKpi = await this.prisma.weeklyKpiRecord.findFirst({
      where: { employeeId, isInactive: false },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    })

    if (!latestKpi || !latestKpi.score) {
      throw new NotFoundException('No active weekly KPI record found to deduct from')
    }

    const currentScore = Number(latestKpi.score)
    const newScore = Math.max(0, currentScore - deductionPoints)

    await this.prisma.weeklyKpiRecord.update({
      where: { id: latestKpi.id },
      data: {
        score: new Prisma.Decimal(newScore.toFixed(2)),
        evaluationBreakdown: {
          ...(latestKpi.evaluationBreakdown as any),
          disciplinaryDeductions: [
            ...((latestKpi.evaluationBreakdown as any)?.disciplinaryDeductions || []),
            {
              deductedBy: chroActor.id,
              points: deductionPoints,
              reason,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      },
    })

    await this.appendKpiAuditLog({
      employeeId,
      metricType: 'KPI',
      deltaValue: new Prisma.Decimal((-deductionPoints).toFixed(2)),
      resultingTotal: new Prisma.Decimal(newScore.toFixed(2)),
      actionType: 'CHRO_DISCIPLINARY',
      triggerEvent: `Disciplinary Action: ${reason}`,
      authorizedById: chroActor.id,
      authorizedRole: 'CHRO',
      reason,
    })

    return {
      success: true,
      previousScore: currentScore,
      deductionPoints,
      newScore,
      reason,
    }
  }

  // --------------------------------------------------------------------------
  // 6. CHRO TASK WEIGHT VERIFICATION GATE & MASSIVE XP
  // --------------------------------------------------------------------------
  async verifyTaskWeight(
    verificationId: string,
    approvedWeight: number,
    chroActor: AuthenticatedUser,
    notes?: string,
  ) {
    const verification = await this.prisma.taskWeightVerification.findUnique({
      where: { id: verificationId },
      include: { task: true, milestone: true },
    })

    if (!verification) {
      throw new NotFoundException(`Task weight verification ${verificationId} not found`)
    }

    const isModified = approvedWeight !== Number(verification.proposedWeight)
    const isMassiveXp = approvedWeight >= 50 // 50 weight = 500 XP

    const updated = await this.prisma.taskWeightVerification.update({
      where: { id: verificationId },
      data: {
        approvedWeight: new Prisma.Decimal(approvedWeight),
        status: 'APPROVED',
        chroId: chroActor.id,
        chroNotes: notes || null,
        isMassiveXp,
        massiveXpFrozen: isMassiveXp,
      },
    })

    // If task was already completed and weight was pending, disburse XP now
    if (verification.task && verification.task.status === 'completed' && !isMassiveXp && verification.status === 'PENDING_CHRO') {
      const context = verification.context || 'MAIN_SQUAD'
      const squadMultiplier = context === 'MAIN_SQUAD' ? 1.0 : context === 'OUTSIDE_SQUAD' ? 0.7 : 0.5
      const xpYield = Math.round(approvedWeight * squadMultiplier * 10)
      await this.prisma.employee.update({
        where: { id: verification.task.assigneeId },
        data: { lifetimeXp: { increment: xpYield } },
      })

      await this.appendKpiAuditLog({
        employeeId: verification.task.assigneeId,
        metricType: 'XP',
        deltaValue: new Prisma.Decimal(xpYield),
        actionType: 'TASK_XP_YIELD',
        triggerEvent: `Weight Approved: ${verification.task.title}`,
        taskId: verification.task.id,
        authorizedById: chroActor.id,
        authorizedRole: 'CHRO',
        reason: `CHRO verified weight ${approvedWeight} (${context}, yields ${xpYield} XP)`,
      })
    }

    return updated
  }

  // --------------------------------------------------------------------------
  // 7. C-LEVEL MASSIVE XP CONSENSUS VOTING
  // --------------------------------------------------------------------------
  async castConsensusVote(
    verificationId: string,
    executiveActor: AuthenticatedUser,
    decision: 'APPROVE' | 'REJECT',
    notes?: string,
  ) {
    const verification = await this.prisma.taskWeightVerification.findUnique({
      where: { id: verificationId },
      include: {
        task: true,
        consensusVotes: true,
      },
    })

    if (!verification) throw new NotFoundException('Verification record not found')

    // Separation of Duties: Assignee and PM cannot vote on their own task
    if (verification.task?.assigneeId === executiveActor.id) {
      throw new ForbiddenException('Task assignee cannot vote on their own massive XP payout')
    }
    if (verification.proposerId === executiveActor.id) {
      throw new ForbiddenException('Task proposer cannot vote on their proposed massive XP payout')
    }

    await this.prisma.taskWeightConsensusVote.upsert({
      where: {
        verificationId_executiveId: {
          verificationId,
          executiveId: executiveActor.id,
        },
      },
      update: { decision, notes, votedAt: new Date() },
      create: {
        verificationId,
        executiveId: executiveActor.id,
        executiveRole: executiveActor.role.toUpperCase(),
        decision,
        notes,
      },
    })

    // Check if quorum (>= 2 C-Level approvals) reached
    const votes = await this.prisma.taskWeightConsensusVote.findMany({
      where: { verificationId, decision: 'APPROVE' },
    })

    if (votes.length >= 2 && verification.massiveXpFrozen) {
      const approvedWeight = Number(verification.approvedWeight || verification.proposedWeight)
      const context = verification.context || 'MAIN_SQUAD'
      const squadMultiplier = context === 'MAIN_SQUAD' ? 1.0 : context === 'OUTSIDE_SQUAD' ? 0.7 : 0.5
      const xpYield = Math.round(approvedWeight * squadMultiplier * 10)

      await this.prisma.$transaction(async (tx) => {
        await tx.taskWeightVerification.update({
          where: { id: verificationId },
          data: { massiveXpFrozen: false },
        })

        // Guard: Only disburse XP upon consensus if the deliverable is already completed.
        // Otherwise, payout is unlocked and will be disbursed upon PM task approval.
        if (verification.task && verification.task.status === 'completed') {
          await tx.employee.update({
            where: { id: verification.task.assigneeId },
            data: { lifetimeXp: { increment: xpYield } },
          })
        }
      })

      if (verification.task && verification.task.status === 'completed') {
        await this.appendKpiAuditLog({
          employeeId: verification.task.assigneeId,
          metricType: 'XP',
          deltaValue: new Prisma.Decimal(xpYield),
          actionType: 'MASSIVE_XP_RELEASE',
          triggerEvent: `Massive XP Released: ${verification.task.title}`,
          taskId: verification.task.id,
          authorizedById: executiveActor.id,
          authorizedRole: 'C_LEVEL_CONSENSUS',
          reason: `Quorum reached (${votes.length} approvals) for massive XP payout`,
        })
      }

      return { status: 'UNFROZEN', approvalsCount: votes.length, xpYield }
    }

    return { status: 'VOTE_RECORDED', approvalsCount: votes.length }
  }

  // --------------------------------------------------------------------------
  // 7B. EXECUTIVE READ-RECEIPT CONFIRMATION & REVIEW GATE
  // --------------------------------------------------------------------------
  async getExecutivePendingReviews(actor: AuthenticatedUser) {
    const role = actor.role.toLowerCase()
    const isExecutive = ['ceo', 'chro', 'cto', 'cfo', 'cpo'].includes(role)
    if (!isExecutive) {
      throw new ForbiddenException('Only C-Suite executives can access pending review queues')
    }

    return this.prisma.weeklyKpiRecord.findMany({
      where: {
        evaluationStatus: 'PROVISIONAL',
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            title: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    })
  }

  async confirmExecutiveReview(
    recordId: string,
    executiveActor: AuthenticatedUser,
    options?: {
      overrideScore?: number
      notes?: string
    },
  ) {
    const role = executiveActor.role.toLowerCase()
    const isExecutive = ['ceo', 'chro', 'cto', 'cfo', 'cpo'].includes(role)
    if (!isExecutive) {
      throw new ForbiddenException('Only C-Suite executives can confirm weekly evaluations')
    }

    const record = await this.prisma.weeklyKpiRecord.findUnique({
      where: { id: recordId },
      include: { employee: true },
    })

    if (!record) {
      throw new NotFoundException(`Weekly KPI record ${recordId} not found`)
    }

    const execRole = executiveActor.role.toUpperCase()
    let cto = Number(record.ctoScore ?? record.score ?? 85)
    let cpo = Number(record.cpoScore ?? record.score ?? 85)
    let cfo = Number(record.cfoScore ?? record.score ?? 85)
    let chro = Number(record.chroScore ?? record.score ?? 85)
    const pm = Number(record.pmScore ?? record.score ?? 85)

    if (options?.overrideScore !== undefined) {
      if (execRole === 'CTO') cto = options.overrideScore
      else if (execRole === 'CPO') cpo = options.overrideScore
      else if (execRole === 'CFO') cfo = options.overrideScore
      else if (execRole === 'CHRO') chro = options.overrideScore
    }

    const existingBreakdown = (record.evaluationBreakdown as any) || {}
    const penaltyApplied = existingBreakdown.returnPenaltyApplied ?? false

    // Recalculate composite weekly score: 50% PM + 15% CTO + 15% CPO + 10% CFO + 10% CHRO
    let recalculatedScore = pm * 0.5 + cto * 0.15 + cpo * 0.15 + cfo * 0.1 + chro * 0.1
    if (penaltyApplied) {
      recalculatedScore = Math.max(0, recalculatedScore - 10)
    }

    const reviews = existingBreakdown.executiveReviews || []
    reviews.push({
      executiveId: executiveActor.id,
      executiveRole: execRole,
      confirmedAt: new Date().toISOString(),
      overrideScore: options?.overrideScore,
      notes: options?.notes,
    })

    const updateData: any = {
      score: new Prisma.Decimal(recalculatedScore.toFixed(2)),
      ctoScore: new Prisma.Decimal(cto.toFixed(2)),
      cpoScore: new Prisma.Decimal(cpo.toFixed(2)),
      cfoScore: new Prisma.Decimal(cfo.toFixed(2)),
      chroScore: new Prisma.Decimal(chro.toFixed(2)),
      evaluationStatus: 'CONFIRMED',
      evaluationBreakdown: {
        ...existingBreakdown,
        executiveReviews: reviews,
        executiveSignoffs: {
          ...(existingBreakdown.executiveSignoffs || {}),
          [execRole.toLowerCase()]: {
            status: 'CONFIRMED',
            confirmedAt: new Date().toISOString(),
            overrideScore: options?.overrideScore,
          },
        },
      },
    }

    const updated = await this.prisma.weeklyKpiRecord.update({
      where: { id: recordId },
      data: updateData,
    })

    await this.appendKpiAuditLog({
      employeeId: record.employeeId,
      metricType: 'KPI',
      deltaValue: new Prisma.Decimal(0),
      resultingTotal: new Prisma.Decimal(recalculatedScore.toFixed(2)),
      actionType: 'WEEKLY_KPI_FINAL',
      triggerEvent: `Executive Confirmation: ${execRole} confirmed Week ${record.weekNumber} KPI`,
      authorizedById: executiveActor.id,
      authorizedRole: execRole,
      reason: options?.notes || `${execRole} confirmed weekly KPI review`,
    })

    return updated
  }

  // --------------------------------------------------------------------------
  // 8. APPEND-ONLY CRYPTOGRAPHIC AUDIT LOG
  // --------------------------------------------------------------------------
  async appendKpiAuditLog(data: {
    employeeId: string
    metricType: 'KPI' | 'XP'
    deltaValue: Prisma.Decimal
    resultingTotal?: Prisma.Decimal | null
    actionType: string
    triggerEvent: string
    taskId?: string | null
    authorizedById?: string | null
    authorizedRole: string
    reason?: string | null
  }) {
    // Get last entry to compute SHA-256 hash chain
    const lastEntry = await this.prisma.kpiXpAuditLog.findFirst({
      orderBy: { sequence: 'desc' },
      select: { sequence: true, entryHash: true },
    })

    const sequence = (lastEntry?.sequence || 0) + 1
    const prevHash = lastEntry?.entryHash || '00000000000000000000000000000000'

    const payload = `${sequence}|${prevHash}|${data.employeeId}|${data.metricType}|${data.deltaValue}|${data.actionType}|${Date.now()}`
    const entryHash = crypto.createHash('sha256').update(payload).digest('hex')

    return this.prisma.kpiXpAuditLog.create({
      data: {
        sequence,
        prevHash,
        entryHash,
        employeeId: data.employeeId,
        metricType: data.metricType,
        deltaValue: data.deltaValue,
        resultingTotal: data.resultingTotal,
        actionType: data.actionType,
        triggerEvent: data.triggerEvent,
        taskId: data.taskId,
        authorizedById: data.authorizedById,
        authorizedRole: data.authorizedRole,
        reason: data.reason,
      },
    })
  }

  // --------------------------------------------------------------------------
  // 9. QUERY INTERFACES (USER-FACING AUDIT & TRENDS)
  // --------------------------------------------------------------------------
  async getEmployeeKpiHistory(employeeId: string) {
    return this.prisma.weeklyKpiRecord.findMany({
      where: { employeeId },
      orderBy: [{ year: 'asc' }, { weekNumber: 'asc' }],
    })
  }

  async getEmployeeAuditLogs(employeeId: string) {
    return this.prisma.kpiXpAuditLog.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
      include: {
        authorizedBy: {
          select: { id: true, name: true, title: true },
        },
      },
    })
  }

  // Helpers
  private getWeekStartDate(week: number, year: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7)
    const dow = simple.getDay()
    const ISOweekStart = simple
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
    return ISOweekStart
  }

  private getWeekEndDate(week: number, year: number): Date {
    const start = this.getWeekStartDate(week, year)
    return new Date(start.getTime() + 7 * 86400000 - 1)
  }
}
