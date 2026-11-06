export type Job = {
  id: string;
  company: string;
  title: string;
  location: string;
  contract: string;
  salary: string;
  skills: string[];
  date: string | null;
  description: string;
  matches: string[];
  questions: string[];
  url?: string;
  source?: string;
};
