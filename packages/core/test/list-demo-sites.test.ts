import { describe, expect, it } from "vitest";

import {
  ListDemoSitesResultSchema,
  listDemoSites,
} from "../src/index.js";

describe("listDemoSites", () => {
  it("returns one schema-valid fictional site", () => {
    const result = listDemoSites();

    expect(ListDemoSitesResultSchema.parse(result)).toEqual(result);
    expect(result.sites).toHaveLength(1);
    expect(result.sites[0]?.dataSource).toBe("synthetic");
  });
});
