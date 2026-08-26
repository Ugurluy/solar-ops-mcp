import { describe, expect, it } from "vitest";

import {
  ListDemoSitesResultSchema,
  listDemoSites,
} from "../src/index.js";

describe("listDemoSites", () => {
  it("returns four schema-valid fictional sites", () => {
    const result = listDemoSites();

    expect(ListDemoSitesResultSchema.parse(result)).toEqual(result);
    expect(result.sites).toHaveLength(4);
    expect(result.sites[0]?.dataSource).toBe("synthetic");
  });
});
