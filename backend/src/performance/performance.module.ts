import { Module } from '@nestjs/common'
import { PerformanceService } from './performance.service'
import { PerformanceController } from './performance.controller'
import { ChroGovernanceController } from './chro-governance.controller'
import { KpiEngineService } from './kpi-engine.service'
import { FinanceModule } from '../finance/finance.module'

@Module({
  imports: [FinanceModule],
  controllers: [ChroGovernanceController, PerformanceController],
  providers: [PerformanceService, KpiEngineService],
  exports: [PerformanceService, KpiEngineService],
})
export class PerformanceModule {}
