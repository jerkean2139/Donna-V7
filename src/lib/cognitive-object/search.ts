import type { CognitiveObject, CognitiveObjectType } from "./types";

export interface CognitiveObjectFilter {
  query?: string;
  objectType?: CognitiveObjectType | "all";
}

// Pure, case-insensitive filter over a tenant's Cognitive Objects. Matches the
// query against title, summary, and objective, and narrows by type when one is
// selected. Ordering is preserved from the input list.
export function filterCognitiveObjects(
  objects: CognitiveObject[],
  filter: CognitiveObjectFilter,
): CognitiveObject[] {
  const query = filter.query?.trim().toLowerCase();
  const objectType = filter.objectType && filter.objectType !== "all" ? filter.objectType : null;

  return objects.filter((object) => {
    if (objectType && object.objectType !== objectType) {
      return false;
    }

    if (query) {
      const haystack = [object.title, object.summary, object.objective]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
}
