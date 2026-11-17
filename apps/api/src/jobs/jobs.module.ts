import { Module } from '@nestjs/common';
import { JobRefreshService } from './job-refresh.service.js';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';

@Module({ controllers: [JobsController], providers: [JobsService, JobRefreshService] })
export class JobsModule {}
