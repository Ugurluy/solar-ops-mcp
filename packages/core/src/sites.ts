import {
  DemoSiteSchema,
  ListDemoSitesResultSchema,
  type DemoSite,
  type ListDemoSitesResult,
} from "./schemas.js";

const demoSites = DemoSiteSchema.array().parse([
  {
    siteId: "demo-sunridge-az",
    name: "Sunridge Demo Site",
    vendor: "solaredge",
    location: {
      city: "Phoenix",
      region: "Arizona",
      countryCode: "US",
    },
    capacityKw: 12.4,
    activeScenario: "baseline",
    dataSource: "synthetic",
  },
  {
    siteId: "demo-cedar-or",
    name: "Cedar Ridge Demo Site",
    vendor: "fronius",
    location: {
      city: "Bend",
      region: "Oregon",
      countryCode: "US",
    },
    capacityKw: 8.2,
    activeScenario: "recovering",
    dataSource: "synthetic",
  },
  {
    siteId: "demo-harbor-ca",
    name: "Harbor View Demo Site",
    vendor: "enphase",
    location: {
      city: "San Diego",
      region: "California",
      countryCode: "US",
    },
    capacityKw: 6.6,
    activeScenario: "soiled",
    dataSource: "synthetic",
  },
  {
    siteId: "demo-mesa-nv",
    name: "Mesa Flats Demo Site",
    vendor: "huawei",
    location: {
      city: "Las Vegas",
      region: "Nevada",
      countryCode: "US",
    },
    capacityKw: 15,
    activeScenario: "dusty",
    dataSource: "synthetic",
  },
]);

export function listDemoSites(): ListDemoSitesResult {
  return ListDemoSitesResultSchema.parse({
    sites: demoSites,
    dataSource: "synthetic",
    disclaimer: "Fictional demonstration data; not operational advice.",
  });
}

export function getDemoSite(siteId: string): DemoSite {
  const site = demoSites.find((candidate) => candidate.siteId === siteId);
  if (!site) {
    throw new Error(`Unknown demo site: ${siteId}`);
  }

  return site;
}
