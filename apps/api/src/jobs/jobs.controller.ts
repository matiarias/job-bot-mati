import { Controller, Get } from '@nestjs/common';
import type { Job } from '@job-bot/contracts';
import { JobsService } from './jobs.service.js';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(): Promise<Job[]> {
    return this.jobs.list();
  }
}
