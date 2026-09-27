import type { AnalysisJob } from "../types/job";

/**
 * Thread-safe In-Memory Job Store for Server-Side Analysis Jobs.
 */
class JobStore {
  private jobs: Map<string, AnalysisJob> = new Map();

  create(job: AnalysisJob): void {
    this.jobs.set(job.jobId, { ...job });
  }

  get(jobId: string): AnalysisJob | null {
    const job = this.jobs.get(jobId);
    return job ? { ...job } : null;
  }

  update(jobId: string, patch: Partial<AnalysisJob>): AnalysisJob | null {
    const existing = this.jobs.get(jobId);
    if (!existing) return null;

    const updated: AnalysisJob = {
      ...existing,
      ...patch,
    };
    this.jobs.set(jobId, updated);
    return { ...updated };
  }

  list(limit: number = 20): AnalysisJob[] {
    const all = Array.from(this.jobs.values());
    all.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return all.slice(0, limit);
  }

  delete(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  clear(): void {
    this.jobs.clear();
  }
}

// Preserve JobStore across hot-module reloading in Next.js development
const globalForJobs = globalThis as unknown as {
  siteLensJobStore?: JobStore;
};

export const defaultJobStore =
  globalForJobs.siteLensJobStore || new JobStore();

if (process.env.NODE_ENV !== "production") {
  globalForJobs.siteLensJobStore = defaultJobStore;
}
