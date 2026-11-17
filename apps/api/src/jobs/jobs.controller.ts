import { Controller, Get, Headers, HttpCode, Inject, Post } from '@nestjs/common';
import type { Job } from '@job-bot/contracts';
import { JobRefreshService } from './job-refresh.service.js';
import { JobsService } from './jobs.service.js';

@Controller('jobs')
export class JobsController {
  constructor(
    @Inject(JobsService) private readonly jobs: JobsService,
    @Inject(JobRefreshService) private readonly jobRefresh: JobRefreshService,
  ) {}

  @Post('refresh')
  @HttpCode(200)
  refresh(@Headers('authorization') authorization?: string) {
    return this.jobRefresh.refresh(authorization);
  }

  @Get()
  list(): Promise<Job[]> {
    return this.jobs.list();
  }
}
