export type Source = 'Get on Board' | 'Himalayas';

export interface Job {
  source: Source;
  id: string;
  title: string;
  company: string;
  description: string;
  requirements?: string;
  url: string;
  directUrl?: string;
  statusUrl: string;
  mode: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  countries?: string[];
  timezones?: number[];
  worldwide?: boolean;
  seniority?: string;
  contract?: string;
  expires?: number;
  salary?: { min?: number; max?: number; currency?: string; period?: string };
}

export type Decision = 'eligible' | 'location-review' | 'requirements-review' | 'exclude';
export interface Screen {
  decision: Decision;
  geography: string;
  reasons: string[];
  points: number;
}
