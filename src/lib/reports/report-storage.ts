import { promises as fs } from "fs";
import path from "path";
import type {
  AuditHistorySummary,
  IReportStorage,
  SiteLensAuditReport,
} from "../types/reports";
import { normalizeUrl } from "../utils/url-helpers";

export class FileReportStorage implements IReportStorage {
  private baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = customDir || process.env.STORAGE_DATA_DIR || path.join(process.cwd(), "data", "reports");
  }

  private async ensureDir() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // directory exists
    }
  }

  private getFilePath(id: string): string {
    const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, "");
    return path.join(this.baseDir, `${sanitizedId}.json`);
  }

  async saveReport(report: SiteLensAuditReport): Promise<void> {
    await this.ensureDir();
    const filePath = this.getFilePath(report.id);
    await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf8");
  }

  async getReportById(id: string): Promise<SiteLensAuditReport | null> {
    await this.ensureDir();
    const filePath = this.getFilePath(id);
    try {
      const data = await fs.readFile(filePath, "utf8");
      return JSON.parse(data) as SiteLensAuditReport;
    } catch {
      return null;
    }
  }

  async listHistory(url?: string, limit: number = 20): Promise<AuditHistorySummary[]> {
    await this.ensureDir();
    try {
      const files = await fs.readdir(this.baseDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      const summaries: AuditHistorySummary[] = [];

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.baseDir, file);
          const raw = await fs.readFile(filePath, "utf8");
          const report = JSON.parse(raw) as SiteLensAuditReport;

          if (url) {
            const normFilter = normalizeUrl(url);
            if (report.normalizedUrl !== normFilter && report.targetUrl !== url) {
              continue;
            }
          }

          let critical = 0;
          let warning = 0;
          let info = 0;

          for (const iss of report.analysis.allIssues || []) {
            if (iss.severity === "critical") critical++;
            else if (iss.severity === "warning") warning++;
            else if (iss.severity === "info") info++;
          }

          summaries.push({
            id: report.id,
            targetUrl: report.targetUrl,
            createdAt: report.createdAt,
            overallScore: report.scores.overallScore,
            overallGrade: report.scores.overallGrade,
            issuesCount: { critical, warning, info },
          });
        } catch {
          // ignore corrupted or unreadable individual file
        }
      }

      // Sort newest first
      summaries.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return summaries.slice(0, limit);
    } catch {
      return [];
    }
  }
}

export const defaultReportStorage = new FileReportStorage();
