import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common'
import { KpiEngineService } from './kpi-engine.service'
import { PrismaService } from '../common/prisma.service'
import { AuthenticatedUser } from '../common/auth-user.interface'
import { CurrentUser } from '../common/current-user.decorator'
import { PermissionsGuard } from '../common/permissions.guard'
import { RequirePermissions, RequireAnyPermission } from '../common/require-permissions.decorator'
import { RequiresFreshMfa } from '../common/requires-fresh-mfa.decorator'

@Controller('performance')
@UseGuards(PermissionsGuard)
export class ChroGovernanceController {
  constructor(
    private readonly kpiEngine: KpiEngineService,
    private readonly prisma: PrismaService,
  ) {}

  // --------------------------------------------------------------------------
  // 1. CHRO TASK & MILESTONE WEIGHT VERIFICATION QUEUE
  // --------------------------------------------------------------------------
  @Get('chro/weight-queue')
  @RequireAnyPermission('performance:read_all', 'kpi:verify_weight')
  async getWeightQueue(@Query('status') status?: string) {
    const where: any = {}
    if (status) {
      where.status = status
    }

    return this.prisma.taskWeightVerification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            assignee: { select: { id: true, name: true, title: true } },
            project: { select: { id: true, name: true } },
          },
        },
        milestone: {
          select: {
            id: true,
            title: true,
            status: true,
            project: { select: { id: true, name: true } },
          },
        },
        proposer: {
          select: { id: true, name: true, title: true },
        },
        consensusVotes: true,
      },
    })
  }

  @Patch('chro/verify-weight/:id')
  @RequireAnyPermission('performance:discipline', 'performance:evaluate', 'kpi:verify_weight')
  async verifyTaskWeight(
    @Param('id') verificationId: string,
    @Body() body: { approvedWeight: number; notes?: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.kpiEngine.verifyTaskWeight(
      verificationId,
      Number(body.approvedWeight),
      actor,
      body.notes,
    )
  }

  // --------------------------------------------------------------------------
  // 2. CHRO DISCIPLINARY DEDUCTION OVERRIDE
  // --------------------------------------------------------------------------
  @Post('chro/disciplinary-deduction')
  @RequireAnyPermission('performance:discipline', 'kpi:disciplinary_deduction')
  async applyDisciplinaryDeduction(
    @Body() body: { employeeId: string; deductionPoints: number; reason: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.kpiEngine.applyDisciplinaryDeduction(
      body.employeeId,
      body.deductionPoints,
      body.reason,
      actor,
    )
  }

  // --------------------------------------------------------------------------
  // 3. C-LEVEL MASSIVE XP CONSENSUS VOTING
  // --------------------------------------------------------------------------
  @Post('tasks/weight-verification/:id/vote')
  @RequireAnyPermission('votes:cast', 'governance:vote', 'performance:evaluate', 'performance:read_all')
  async castConsensusVote(
    @Param('id') verificationId: string,
    @Body() body: { decision: 'APPROVE' | 'REJECT'; notes?: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const isExecutive = ['ceo', 'chro', 'cto', 'cfo', 'cpo'].includes(actor.role?.toLowerCase())
    if (!isExecutive) {
      throw new ForbiddenException('Only C-Suite executives can cast consensus votes on massive XP items')
    }
    return this.kpiEngine.castConsensusVote(
      verificationId,
      actor,
      body.decision,
      body.notes,
    )
  }

  // --------------------------------------------------------------------------
  // 3B. C-LEVEL EXECUTIVE READ-RECEIPT REVIEW QUEUE
  // --------------------------------------------------------------------------
  @Get('executive/pending-reviews')
  @RequireAnyPermission('performance:read_all', 'reports:read_standard', 'governance:vote')
  async getExecutivePendingReviews(@CurrentUser() actor: AuthenticatedUser) {
    return this.kpiEngine.getExecutivePendingReviews(actor)
  }

  @Post('executive/reviews/:id/confirm')
  @RequireAnyPermission('performance:evaluate', 'governance:vote')
  async confirmExecutiveReview(
    @Param('id') recordId: string,
    @Body() body: { overrideScore?: number; notes?: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.kpiEngine.confirmExecutiveReview(recordId, actor, body)
  }

  // --------------------------------------------------------------------------
  // 4. USER-FACING KPI HISTORY & IMMUTABLE AUDIT LOG
  // --------------------------------------------------------------------------
  @Get('audit-log/:employeeId')
  async getEmployeeAuditLogs(
    @Param('employeeId') employeeId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (
      actor.id !== employeeId &&
      !['chro', 'ceo', 'cpo', 'cto', 'cfo'].includes(actor.role.toLowerCase())
    ) {
      throw new ForbiddenException('Access denied: You may only view your own audit logs.')
    }
    return this.kpiEngine.getEmployeeAuditLogs(employeeId)
  }

  @Get('kpi-history/:employeeId')
  async getEmployeeKpiHistory(
    @Param('employeeId') employeeId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (
      actor.id !== employeeId &&
      !['chro', 'ceo', 'cpo', 'cto', 'cfo', 'pm'].includes(actor.role.toLowerCase())
    ) {
      throw new ForbiddenException('Access denied: You may only view your own KPI history.')
    }
    return this.kpiEngine.getEmployeeKpiHistory(employeeId)
  }

  // --------------------------------------------------------------------------
  // 5. EMPLOYEE OVERALL SUMMARY (LIFETIME XP, CURRENT KPI, INACTIVITY)
  // --------------------------------------------------------------------------
  @Get('summary/:employeeId')
  async getEmployeePerformanceSummary(@Param('employeeId') employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        title: true,
        lifetimeXp: true,
        weeklyKpiRecords: {
          orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
          take: 5,
        },
      },
    })

    if (!employee) return null

    const latestKpi = employee.weeklyKpiRecords[0] || null

    return {
      employeeId: employee.id,
      name: employee.name,
      title: employee.title,
      lifetimeXp: employee.lifetimeXp,
      currentWeeklyKpi: latestKpi?.isInactive ? 'N/A' : latestKpi?.score ? Number(latestKpi.score) : 85,
      isInactive: latestKpi?.isInactive || false,
      recentKpiHistory: employee.weeklyKpiRecords,
    }
  }

  // --------------------------------------------------------------------------
  // 6. ON-DEMAND EVALUATION CALCULATORS
  // --------------------------------------------------------------------------
  @Post('calculate/developer/:employeeId')
  @RequireAnyPermission('performance:read_all', 'tasks:approve')
  async calculateDeveloperWeeklyKpi(
    @Param('employeeId') employeeId: string,
    @Body() body: { weekNumber: number; year: number },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.kpiEngine.calculateDeveloperWeeklyKpi(
      employeeId,
      body.weekNumber,
      body.year,
      actor,
    )
  }

  @Post('calculate/pm/:employeeId')
  @RequireAnyPermission('performance:read_all', 'governance:approve_request')
  async calculatePmWeeklyKpi(
    @Param('employeeId') employeeId: string,
    @Body()
    body: {
      weekNumber: number
      year: number
      ctoScore?: number
      cpoScore?: number
      cfoScore?: number
      chroScore?: number
      notes?: string
    },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.kpiEngine.calculatePmWeeklyKpi(
      employeeId,
      body.weekNumber,
      body.year,
      body,
      actor,
    )
  }

  @Post('calculate/c-level/:employeeId')
  @RequireAnyPermission('performance:read_all', 'governance:vote')
  async calculateCLevelWeeklyKpi(
    @Param('employeeId') employeeId: string,
    @Body()
    body: {
      roleTitle: 'CTO' | 'CPO' | 'CFO' | 'CHRO'
      weekNumber: number
      year: number
      macroGoals?: number
      ceoDirectReview?: number
      peerSynergy?: number
    },
  ) {
    return this.kpiEngine.calculateCLevelWeeklyKpi(
      employeeId,
      body.roleTitle,
      body.weekNumber,
      body.year,
      body.macroGoals,
      body.ceoDirectReview,
      body.peerSynergy,
    )
  }

  @Post('calculate/ceo/:employeeId')
  @RequireAnyPermission('performance:read_all', 'governance:vote')
  async calculateCeoWeeklyKpi(
    @Param('employeeId') employeeId: string,
    @Body()
    body: {
      weekNumber: number
      year: number
      companyPerformanceScore?: number
    },
  ) {
    return this.kpiEngine.calculateCeoWeeklyKpi(
      employeeId,
      body.weekNumber,
      body.year,
      body.companyPerformanceScore,
    )
  }

  // --------------------------------------------------------------------------
  // 7. PM WEIGHT PROPOSAL GATE
  // --------------------------------------------------------------------------
  @Post('propose-weight')
  @RequireAnyPermission(
    'tasks:create_personal',
    'tasks:create_assign',
    'tasks:approve',
    'performance:evaluate',
    'performance:read_all',
  )
  async proposeTaskWeight(
    @Body()
    body: {
      taskId?: string
      milestoneId?: string
      proposedWeight: number
      category?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'CRITICAL' | 'CUSTOM'
      context?: 'MAIN_SQUAD' | 'OUTSIDE_SQUAD' | 'DIRECT_EXECUTIVE'
    },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.kpiEngine.proposeTaskWeight({
      ...body,
      actor,
    })
  }

  // --------------------------------------------------------------------------
  // 8. MACRO MILESTONE PM XP AWARD GATE
  // --------------------------------------------------------------------------
  @Post('milestones/:id/approve-xp')
  @RequireAnyPermission('governance:vote', 'performance:evaluate', 'milestones:update')
  async awardMilestoneXpToPm(
    @Param('id') milestoneId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.kpiEngine.awardMilestoneXpToPm(milestoneId, actor)
  }

  // --------------------------------------------------------------------------
  // 9. GOVERNANCE OVERRIDE & MODIFICATION GATE (CEO MFA, CHRO FULL, C-LEVEL, PM)
  // --------------------------------------------------------------------------
  @Post('override')
  @RequireAnyPermission(
    'performance:evaluate',
    'performance:discipline',
    'performance:read_all',
    'governance:vote',
  )
  async overrideRecord(
    @Body()
    body: {
      targetEmployeeId: string
      metricType: 'KPI' | 'XP'
      weekNumber?: number
      year?: number
      score?: number | null
      deltaXp?: number
      newLifetimeXp?: number
      reason?: string
      mfaCode?: string
    },
    @Headers('x-mfa-code') mfaHeader: string | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const mfaCode = (body.mfaCode || mfaHeader || '').trim()
    return this.kpiEngine.overrideRecord({
      ...body,
      mfaCode: mfaCode || undefined,
      actor,
    })
  }

  // --------------------------------------------------------------------------
  // 10. AUDIT LOG MODIFICATION (CHRO FULL ACCESS & CEO)
  // --------------------------------------------------------------------------
  @Patch('audit-log/:id')
  @RequireAnyPermission(
    'performance:discipline',
    'performance:evaluate',
    'performance:read_all',
    'governance:vote',
  )
  async updateAuditLog(
    @Param('id') id: string,
    @Body() body: { reason?: string; notes?: string; actionType?: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.kpiEngine.updateAuditLogEntry(id, body, actor)
  }
}
