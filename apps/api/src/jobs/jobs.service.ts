import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { Job } from '@job-bot/contracts';
import { exampleJobs } from './example-jobs.js';
import { createSupabaseJobsReader } from './supabase-jobs.js';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly readSupabase = createSupabaseJobsReader();

  async list(): Promise<Job[]> {
    if (!this.readSupabase) return exampleJobs;

    try {
      return await this.readSupabase();
    } catch (error) {
      this.logger.warn(error instanceof Error ? error.message : 'Error al consultar Supabase.');
      throw new ServiceUnavailableException('El catálogo de ofertas no está disponible.');
    }
  }
}
