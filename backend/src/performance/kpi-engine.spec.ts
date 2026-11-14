import { Test, TestingModule } from '@nestjs/testing'
import { KpiEngineService } from './kpi-engine.service'
import { PrismaService } from '../common/prisma.service'
import { Prisma } from '@prisma/client'

describe('KpiEngineService - Dual-Metric Governance & Mathematical Formulas', () => {
  let service: KpiEngineService
  let prisma: any

  const mockActor: any = {
    id: 'emp_chro_01',
    role: 'chro',
    email: 'chro@pointfex.com',
  }

  beforeEach(async () => {
    prisma = {
      employee: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      weeklyKpiRecord: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      taskWeightVerification: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      taskWeightConsensusVote: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      kpiXpAuditLog: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [KpiEngineService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = module.get<KpiEngineService>(KpiEngineService)
  })

  describe('1. Developer Level 1 Evaluation', () => {
    it('should flag N/A Red Flag if developer completes zero tasks in a week', async () => {
      prisma.employee.findUnique.mockResolvedValue({
        id: 'emp_dev_01',
        assignedTasks: [],
      })

      prisma.weeklyKpiRecord.upsert.mockResolvedValue({
        id: 'kpi_01',
        employeeId: 'emp_dev_01',
        score: null,
        isInactive: true,
        inactivityPenaltyPending: true,
      })

      prisma.kpiXpAuditLog.findFirst.mockResolvedValue(null)
      prisma.kpiXpAuditLog.create.mockResolvedValue({ id: 'audit_01' })

      const result = await service.calculateDeveloperWeeklyKpi('emp_dev_01', 46, 2026)

      expect(result.isInactive).toBe(true)
      expect(result.score).toBeNull()
      expect(prisma.kpiXpAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionType: 'INACTIVITY_PENALTY',
            authorizedRole: 'SYSTEM',
          }),
        }),
      )
    })

    it('should calculate weighted score based on task weights and squad context (100% main, 70% outside)', async () => {
      prisma.employee.findUnique.mockResolvedValue({
        id: 'emp_dev_01',
        assignedTasks: [
          {
            id: 't1',
            title: 'Main Squad Feature',
            weightVerification: { approvedWeight: new Prisma.Decimal(5), context: 'MAIN_SQUAD' },
          },
          {
            id: 't2',
            title: 'Outside Squad Bugfix',
            weightVerification: { approvedWeight: new Prisma.Decimal(3), context: 'OUTSIDE_SQUAD' },
          },
        ],
      })

      prisma.weeklyKpiRecord.upsert.mockImplementation(({ create }) => create)
      prisma.kpiXpAuditLog.findFirst.mockResolvedValue(null)
      prisma.kpiXpAuditLog.create.mockResolvedValue({ id: 'audit_02' })

      const result = await service.calculateDeveloperWeeklyKpi('emp_dev_01', 46, 2026, mockActor)

      expect(result.isInactive).toBe(false)
      expect(Number(result.score)).toBeGreaterThan(0)
      expect(result.evaluationStatus).toBe('PROVISIONAL')
    })
  })

  describe('2. Project Manager Level 2 Evaluation', () => {
    it('should calculate PM score from 30% CTO + 30% CPO + 20% CFO + 20% CHRO', async () => {
      prisma.weeklyKpiRecord.upsert.mockImplementation(({ create }) => create)
      prisma.kpiXpAuditLog.findFirst.mockResolvedValue(null)
      prisma.kpiXpAuditLog.create.mockResolvedValue({ id: 'audit_03' })

      // CTO=90, CPO=90, CFO=80, CHRO=80 -> (90*0.3)+(90*0.3)+(80*0.2)+(80*0.2) = 27 + 27 + 16 + 16 = 86
      const result = await service.calculatePmWeeklyKpi('emp_pm_01', 46, 2026, {
        ctoScore: 90,
        cpoScore: 90,
        cfoScore: 80,
        chroScore: 80,
      })

      expect(Number(result.score)).toBe(86.0)
      expect(result.evaluationStatus).toBe('CONFIRMED')
    })
  })

  describe('3. CHRO Disciplinary Deduction', () => {
    it('should deduct points and record immutable audit trail', async () => {
      prisma.weeklyKpiRecord.findFirst.mockResolvedValue({
        id: 'kpi_current',
        score: new Prisma.Decimal(95),
        evaluationBreakdown: {},
      })
      prisma.weeklyKpiRecord.update.mockResolvedValue({})
      prisma.kpiXpAuditLog.findFirst.mockResolvedValue(null)
      prisma.kpiXpAuditLog.create.mockResolvedValue({ id: 'audit_disc' })

      const result = await service.applyDisciplinaryDeduction(
        'emp_dev_01',
        15,
        'Unauthorized prod access',
        mockActor,
      )

      expect(result.success).toBe(true)
      expect(result.previousScore).toBe(95)
      expect(result.newScore).toBe(80)
      expect(prisma.kpiXpAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionType: 'CHRO_DISCIPLINARY',
            authorizedRole: 'CHRO',
            deltaValue: new Prisma.Decimal(-15),
          }),
        }),
      )
    })
  })

  describe('4. Massive XP Consensus Gate', () => {
    it('should freeze payout for weight >= 50 and unfreeze upon 2 C-Level votes', async () => {
      prisma.taskWeightVerification.findUnique.mockResolvedValue({
        id: 'verif_massive',
        proposedWeight: new Prisma.Decimal(60), // 60 weight = 600 XP (Massive)
        approvedWeight: new Prisma.Decimal(60),
        massiveXpFrozen: true,
        task: { id: 't_massive', assigneeId: 'emp_dev_01', title: 'Core Migration' },
        proposerId: 'emp_pm_01',
      })

      prisma.taskWeightConsensusVote.upsert.mockResolvedValue({})
      prisma.taskWeightConsensusVote.findMany.mockResolvedValue([
        { id: 'v1', executiveId: 'emp_cto_01', decision: 'APPROVE' },
        { id: 'v2', executiveId: 'emp_cpo_01', decision: 'APPROVE' },
      ])

      prisma.kpiXpAuditLog.findFirst.mockResolvedValue(null)
      prisma.kpiXpAuditLog.create.mockResolvedValue({ id: 'audit_unfreeze' })

      const ctoActor: any = { id: 'emp_cto_01', role: 'cto' }
      const result = await service.castConsensusVote('verif_massive', ctoActor, 'APPROVE')

      expect(result.status).toBe('UNFROZEN')
      expect(result.approvalsCount).toBe(2)
      expect(result.xpYield).toBe(600)
    })

    it('should prevent the task assignee from voting on their own payout', async () => {
      prisma.taskWeightVerification.findUnique.mockResolvedValue({
        id: 'verif_massive',
        task: { id: 't_massive', assigneeId: 'emp_dev_01' },
        proposerId: 'emp_pm_01',
      })

      const devActor: any = { id: 'emp_dev_01', role: 'developer' }
      await expect(
        service.castConsensusVote('verif_massive', devActor, 'APPROVE'),
      ).rejects.toThrow('Task assignee cannot vote on their own massive XP payout')
    })
  })
})
