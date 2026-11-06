import { Module } from '@nestjs/common';
import { JobsModule } from './jobs/jobs.module.js';

@Module({ imports: [JobsModule] })
export class AppModule {}
