export type RoadmapTaskStatus = 'not_started' | 'in_progress' | 'completed';

export interface RoadmapTask {
  id: string; // same as issue id
  task: string; // concise action description
  reason: string; // why needed, from recommendation
  affectedCategory: string; // e.g., 'seo', 'performance'
  priority: number; // 1 = highest
  estimatedEffort: string; // e.g., '1 day', '2-3 days'
  evidence: string; // from issue evidence
  status: RoadmapTaskStatus;
}

export interface RoadmapWeek {
  week: number;
  title: string;
  tasks: RoadmapTask[];
}

export interface Roadmap {
  reportId: string;
  generatedAt: string;
  weeks: RoadmapWeek[];
}
