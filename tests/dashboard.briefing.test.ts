import { buildBriefing, type BriefingObject } from "../src/lib/dashboard/briefing";

const MORNING = new Date("2026-07-06T09:00:00.000Z");
const EVENING = new Date("2026-07-06T20:00:00.000Z");

function obj(overrides: Partial<BriefingObject> & { id: string; createdAt: string }): BriefingObject {
  return {
    title: "Untitled",
    objectType: "decision",
    status: "active",
    riskLevel: "low",
    ...overrides,
  };
}

describe("buildBriefing", () => {
  it("greets by time of day and name on a return visit with news", () => {
    const since = new Date("2026-07-05T09:00:00.000Z");
    const briefing = buildBriefing({
      now: EVENING,
      since,
      userName: "Jeremy",
      objects: [
        obj({ id: "1", title: "Raise base price", createdAt: "2026-07-06T10:00:00.000Z" }),
        obj({ id: "2", title: "Old decision", createdAt: "2026-07-01T10:00:00.000Z" }),
      ],
      approvalsNeeded: 2,
      graphLinks: 5,
    });

    expect(briefing.greeting).toBe("Good evening");
    expect(briefing.headline).toBe("Welcome back, Jeremy");
    expect(briefing.isFirstVisit).toBe(false);
    expect(briefing.newObjectCount).toBe(1);
    expect(briefing.spokenText).toContain("Good evening, Jeremy.");
    expect(briefing.spokenText).toContain("1 new cognitive object was created");
    expect(briefing.spokenText).toContain("2 decisions are waiting for your approval");
    expect(briefing.spokenText).toContain('"Raise base price"');
  });

  it("says all caught up when nothing is new since last visit", () => {
    const since = new Date("2026-07-06T08:00:00.000Z");
    const briefing = buildBriefing({
      now: MORNING,
      since,
      userName: "Jeremy",
      objects: [obj({ id: "1", createdAt: "2026-07-01T10:00:00.000Z" })],
      approvalsNeeded: 0,
      graphLinks: 0,
    });

    expect(briefing.greeting).toBe("Good morning");
    expect(briefing.spokenText).toContain("Nothing new since your last visit.");
    expect(briefing.lines).toContain("All caught up — nothing new");
  });

  it("uses first-visit onboarding tone with no objects", () => {
    const briefing = buildBriefing({
      now: MORNING,
      since: null,
      userName: null,
      objects: [],
      approvalsNeeded: 0,
      graphLinks: 0,
    });

    expect(briefing.isFirstVisit).toBe(true);
    expect(briefing.headline).toBe("Welcome to Donna");
    expect(briefing.spokenText).toContain("Welcome to Donna, your intelligence operating system.");
    expect(briefing.spokenText).toContain("You don't have any cognitive objects yet.");
  });

  it("counts only open objects, excluding executed and archived", () => {
    const briefing = buildBriefing({
      now: MORNING,
      since: new Date("2026-07-01T00:00:00.000Z"),
      objects: [
        obj({ id: "1", status: "active", createdAt: "2026-07-02T00:00:00.000Z" }),
        obj({ id: "2", status: "archived", createdAt: "2026-07-02T00:00:00.000Z" }),
        obj({ id: "3", status: "executed", createdAt: "2026-07-02T00:00:00.000Z" }),
        obj({ id: "4", status: "draft", createdAt: "2026-07-02T00:00:00.000Z" }),
      ],
      approvalsNeeded: 0,
      graphLinks: 3,
    });

    expect(briefing.openObjectCount).toBe(2);
    expect(briefing.spokenText).toContain("2 open objects");
  });

  it("omits the name gracefully when it is not provided", () => {
    const briefing = buildBriefing({
      now: EVENING,
      since: new Date("2026-07-05T00:00:00.000Z"),
      objects: [],
      approvalsNeeded: 0,
      graphLinks: 0,
    });

    expect(briefing.headline).toBe("Welcome back");
    expect(briefing.spokenText.startsWith("Good evening. Welcome back to Donna.")).toBe(true);
  });
});
