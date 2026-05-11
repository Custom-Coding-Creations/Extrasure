import {
  createServiceCatalogItem,
  deleteOrDeactivateServiceCatalogItem,
  listServiceCatalogItems,
} from "@/lib/service-catalog";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    serviceCatalogItem: {
      count: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    serviceBooking: {
      count: jest.fn(),
    },
  },
}));

const { prisma } = jest.requireMock("@/lib/prisma") as {
  prisma: {
    serviceCatalogItem: {
      count: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    serviceBooking: {
      count: jest.Mock;
    };
  };
};

describe("service-catalog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("seeds catalog on first list call", async () => {
    prisma.serviceCatalogItem.count.mockResolvedValue(0);
    prisma.serviceCatalogItem.createMany.mockResolvedValue({ count: 6 });
    prisma.serviceCatalogItem.findMany.mockResolvedValue([{ id: "svc_1" }]);

    const result = await listServiceCatalogItems(false);

    expect(prisma.serviceCatalogItem.createMany).toHaveBeenCalled();
    expect(prisma.serviceCatalogItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true },
      }),
    );
    expect(result).toEqual([{ id: "svc_1" }]);
  });

  it("creates a normalized catalog item", async () => {
    prisma.serviceCatalogItem.create.mockResolvedValue({ id: "svc_new" });

    await createServiceCatalogItem({
      name: " Monthly Plan ",
      description: "  Coverage  ",
      serviceType: " general_pest ",
      kind: "subscription",
      billingCycle: "monthly",
      amount: 109.2,
      active: true,
      sortOrder: 10.9,
      stripeProductId: " prod_123 ",
      stripePriceId: " price_123 ",
    });

    expect(prisma.serviceCatalogItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Monthly Plan",
          description: "Coverage",
          serviceType: "general_pest",
          amount: 109,
          sortOrder: 11,
          stripeProductId: "prod_123",
          stripePriceId: "price_123",
        }),
      }),
    );
  });

  it("deactivates instead of deleting when bookings exist", async () => {
    prisma.serviceBooking.count.mockResolvedValue(2);
    prisma.serviceCatalogItem.update.mockResolvedValue({ id: "svc_in_use", active: false });

    const result = await deleteOrDeactivateServiceCatalogItem("svc_in_use");

    expect(prisma.serviceCatalogItem.update).toHaveBeenCalledWith({
      where: { id: "svc_in_use" },
      data: { active: false },
    });
    expect(result.mode).toBe("deactivated");
  });
});
