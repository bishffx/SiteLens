import type { Roadmap } from '@/lib/types/roadmap';
import { promises as fs } from 'fs';
import path from 'path';

export class FileRoadmapStorage {
  private baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = customDir || process.env.STORAGE_DATA_DIR || path.join(process.cwd(), 'data', 'roadmaps');
  }

  private async ensureDir() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  private getFilePath(id: string): string {
    const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(this.baseDir, `${sanitized}.json`);
  }

  async saveRoadmap(roadmap: Roadmap): Promise<void> {
    await this.ensureDir();
    const file = this.getFilePath(roadmap.reportId);
    await fs.writeFile(file, JSON.stringify(roadmap, null, 2), 'utf8');
  }

  async getRoadmapByReportId(reportId: string): Promise<Roadmap | null> {
    await this.ensureDir();
    const file = this.getFilePath(reportId);
    try {
      const data = await fs.readFile(file, 'utf8');
      return JSON.parse(data) as Roadmap;
    } catch {
      return null;
    }
  }

  async updateTaskStatus(reportId: string, taskId: string, newStatus: 'not_started' | 'in_progress' | 'completed'): Promise<Roadmap | null> {
    const roadmap = await this.getRoadmapByReportId(reportId);
    if (!roadmap) return null;
    for (const week of roadmap.weeks) {
      const task = week.tasks.find((t) => t.id === taskId);
      if (task) {
        task.status = newStatus;
        break;
      }
    }
    await this.saveRoadmap(roadmap);
    return roadmap;
  }
}

export const defaultRoadmapStorage = new FileRoadmapStorage();
