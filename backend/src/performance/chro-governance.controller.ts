import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
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
  @RequireAnyPermission('performance:discipline', 'kpi:verify_weight')
  @RequiresFreshMfa('kpi:weight_override')
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
  @RequiresFreshMfa('kpi:disciplinary_deduction')
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
  @RequireAnyPermission('votes:cast', 'governance:vote')
  async castConsensusVote(
    @Param('id') verificationId: string,
    @Body() body: { decision: 'APPROVE' | 'REJECT'; notes?: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.kpiEngine.castConsensusVote(
      verificationId,
      actor,
      body.decision,
      body.notes,
    )
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
}
