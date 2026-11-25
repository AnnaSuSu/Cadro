import type { PullRequestChangeBreakdown } from "@cadro/contracts";
import { summarizeChangedFiles } from "@cadro/shared/changedFileKind";
import type { ProviderFileStats } from "@cadro/source-control-core/server/PullRequestProvider";

export function toChangeBreakdown(stats: ProviderFileStats): PullRequestChangeBreakdown {
  if (stats.truncated) return null;
  return summarizeChangedFiles(stats.files);
}
