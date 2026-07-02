import type { CognitiveGraphEdge } from "../cognitive-graph/types";
import {
  defaultTenantGovernancePolicy,
  evaluateCognitiveObjectGovernance,
  type TenantGovernancePolicy,
} from "../cognitive-object/governance";
import type {
  CognitiveObject,
  CognitiveObjectStatus,
  CognitiveObjectType,
} from "../cognitive-object/types";

// Statuses that mean an object is no longer active work.
const closedStatuses = new Set<CognitiveObjectStatus>(["executed", "archived"]);

export interface DashboardMetrics {
  totalObjects: number;
  openObjects: number;
  approvalsNeeded: number;
  graphLinks: number;
  byType: Array<{ type: CognitiveObjectType; count: number }>;
  byStatus: Array<{ status: CognitiveObjectStatus; count: number }>;
  recentObjects: CognitiveObject[];
}

export interface ComputeDashboardMetricsOptions {
  policy?: TenantGovernancePolicy;
  recentLimit?: number;
}

export function computeDashboardMetrics(
  objects: CognitiveObject[],
  edges: CognitiveGraphEdge[],
  options: ComputeDashboardMetricsOptions = {},
): DashboardMetrics {
  const policy = options.policy ?? defaultTenantGovernancePolicy;
  const recentLimit = options.recentLimit ?? 5;

  const byTypeMap = new Map<CognitiveObjectType, number>();
  const byStatusMap = new Map<CognitiveObjectStatus, number>();

  let openObjects = 0;
  let approvalsNeeded = 0;

  for (const object of objects) {
    byTypeMap.set(object.objectType, (byTypeMap.get(object.objectType) ?? 0) + 1);
    byStatusMap.set(object.status, (byStatusMap.get(object.status) ?? 0) + 1);

    if (!closedStatuses.has(object.status)) {
      openObjects += 1;
    }

    if (evaluateCognitiveObjectGovernance(object, policy).approvalRequired) {
      approvalsNeeded += 1;
    }
  }

  const recentObjects = [...objects]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, recentLimit);

  return {
    totalObjects: objects.length,
    openObjects,
    approvalsNeeded,
    graphLinks: edges.length,
    byType: Array.from(byTypeMap, ([type, count]) => ({ type, count })).sort(
      (left, right) => right.count - left.count,
    ),
    byStatus: Array.from(byStatusMap, ([status, count]) => ({ status, count })).sort(
      (left, right) => right.count - left.count,
    ),
    recentObjects,
  };
}
