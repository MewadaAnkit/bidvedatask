import { Prisma, RfqStatus, Role, EntityType } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../middleware/error.middleware';
import { CreateRfqInput, UpdateRfqInput, RfqQueryParams } from '../validators/rfq.validator';

export class RfqService {
  /**
   * Evaluates if a PUBLISHED RFQ has passed its submission deadline.
   * If yes, lazily marks it as CLOSED in the database.
   */
  static async resolveEffectiveStatus(rfq: {
    id: string;
    status: RfqStatus;
    deadline: Date;
    [key: string]: any;
  }) {
    if (rfq.status === RfqStatus.PUBLISHED && new Date() > new Date(rfq.deadline)) {
      await prisma.$transaction([
        prisma.rFQ.update({
          where: { id: rfq.id },
          data: { status: RfqStatus.CLOSED },
        }),
        prisma.statusHistory.create({
          data: {
            changedById: rfq.buyerId || 'SYSTEM',
            entityType: EntityType.RFQ,
            entityId: rfq.id,
            fromStatus: RfqStatus.PUBLISHED,
            toStatus: RfqStatus.CLOSED,
            reason: 'Submission deadline elapsed (lazy transition)',
          },
        }),
      ]);
      rfq.status = RfqStatus.CLOSED;
    }
    return rfq;
  }

  static async createRfq(buyerId: string, input: CreateRfqInput) {
    const rfq = await prisma.$transaction(async (tx) => {
      const created = await tx.rFQ.create({
        data: {
          buyerId,
          title: input.title,
          description: input.description,
          category: input.category,
          deliveryLocation: input.deliveryLocation,
          budget: input.budget !== undefined && input.budget !== null ? new Prisma.Decimal(input.budget) : null,
          deadline: new Date(input.deadline),
          status: RfqStatus.DRAFT,
          lineItems: {
            create: input.lineItems.map((item) => ({
              name: item.name,
              quantity: new Prisma.Decimal(item.quantity),
              unit: item.unit,
            })),
          },
        },
        include: {
          lineItems: true,
          buyer: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.statusHistory.create({
        data: {
          changedById: buyerId,
          entityType: EntityType.RFQ,
          entityId: created.id,
          fromStatus: 'NONE',
          toStatus: RfqStatus.DRAFT,
          reason: 'RFQ created in draft mode',
        },
      });

      return created;
    },
    {
      maxWait: 10000,
      timeout: 20000,
    });

    return rfq;
  }

  static async updateRfq(userId: string, userRole: Role, rfqId: string, input: UpdateRfqInput) {
    const existing = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: { lineItems: true },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    // Only owning buyer or admin can edit
    if (userRole !== Role.ADMIN && existing.buyerId !== userId) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found'); // Sealed resource protection
    }

    if (existing.status !== RfqStatus.DRAFT) {
      throw new AppError(400, 'INVALID_STATUS', `Cannot edit RFQ in ${existing.status} status. Only DRAFT RFQs can be edited.`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing line items and recreate with new values
      await tx.rFQLineItem.deleteMany({
        where: { rfqId },
      });

      const rfq = await tx.rFQ.update({
        where: { id: rfqId },
        data: {
          title: input.title,
          description: input.description,
          category: input.category,
          deliveryLocation: input.deliveryLocation,
          budget: input.budget !== undefined && input.budget !== null ? new Prisma.Decimal(input.budget) : null,
          deadline: new Date(input.deadline),
          lineItems: {
            create: input.lineItems.map((item) => ({
              name: item.name,
              quantity: new Prisma.Decimal(item.quantity),
              unit: item.unit,
            })),
          },
        },
        include: {
          lineItems: true,
          buyer: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return rfq;
    },
    {
      maxWait: 10000,
      timeout: 20000,
    });

    return updated;
  }

  static async publishRfq(userId: string, userRole: Role, rfqId: string) {
    const existing = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: { lineItems: true },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    if (userRole !== Role.ADMIN && existing.buyerId !== userId) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    if (existing.status !== RfqStatus.DRAFT) {
      throw new AppError(400, 'INVALID_STATUS', `RFQ is already ${existing.status}`);
    }

    if (existing.lineItems.length === 0) {
      throw new AppError(400, 'LINE_ITEMS_REQUIRED', 'RFQ must have at least one line item before publishing');
    }

    if (new Date() >= new Date(existing.deadline)) {
      throw new AppError(400, 'INVALID_DEADLINE', 'Submission deadline must be in the future to publish');
    }

    const published = await prisma.$transaction(async (tx) => {
      const updated = await tx.rFQ.update({
        where: { id: rfqId },
        data: { status: RfqStatus.PUBLISHED },
        include: {
          lineItems: true,
          buyer: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.statusHistory.create({
        data: {
          changedById: userId,
          entityType: EntityType.RFQ,
          entityId: rfqId,
          fromStatus: RfqStatus.DRAFT,
          toStatus: RfqStatus.PUBLISHED,
          reason: 'RFQ published for vendor bidding',
        },
      });

      return updated;
    },
    {
      maxWait: 10000,
      timeout: 20000,
    });

    return published;
  }

  static async getRfqById(userId: string, userRole: Role, rfqId: string) {
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: {
        lineItems: true,
        buyer: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { quotes: true },
        },
      },
    });

    if (!rfq) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    // Role-based view rules:
    // 1. Admin can view anything.
    // 2. Buyer can only view their own RFQs (return 404 if other buyer's RFQ).
    // 3. Vendor can only view PUBLISHED, CLOSED, or AWARDED RFQs (never DRAFT).
    if (userRole === Role.BUYER && rfq.buyerId !== userId) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    if (userRole === Role.VENDOR && rfq.status === RfqStatus.DRAFT) {
      throw new AppError(404, 'NOT_FOUND', 'RFQ not found');
    }

    return await this.resolveEffectiveStatus(rfq);
  }

  static async listRfqs(userId: string, userRole: Role, params: RfqQueryParams) {
    const { page, limit, search, category, deliveryLocation, status, sortBy, sortOrder } = params;
    const skip = (page - 1) * limit;

    const andConditions: Prisma.RFQWhereInput[] = [];

    // 1. Role and Status Scoping
    if (userRole === Role.VENDOR) {
      if (status) {
        if (status === RfqStatus.DRAFT) {
          // Vendors must never view DRAFT RFQs
          andConditions.push({ id: '__unauthorized_draft_rfq__' });
        } else if (status === RfqStatus.PUBLISHED) {
          andConditions.push({
            status: RfqStatus.PUBLISHED,
            deadline: { gt: new Date() },
          });
        } else if (status === RfqStatus.CLOSED) {
          andConditions.push({
            OR: [
              { status: RfqStatus.CLOSED },
              { status: RfqStatus.PUBLISHED, deadline: { lte: new Date() } },
            ],
          });
        } else {
          andConditions.push({ status });
        }
      } else {
        // Vendors only see open/closed/awarded RFQs; never DRAFTs
        andConditions.push({
          status: {
            in: [RfqStatus.PUBLISHED, RfqStatus.CLOSED, RfqStatus.AWARDED],
          },
        });
      }
    } else if (userRole === Role.BUYER) {
      // Buyers see their own RFQs by default
      andConditions.push({ buyerId: userId });
      if (status) {
        if (status === RfqStatus.PUBLISHED) {
          andConditions.push({
            status: RfqStatus.PUBLISHED,
            deadline: { gt: new Date() },
          });
        } else if (status === RfqStatus.CLOSED) {
          andConditions.push({
            OR: [
              { status: RfqStatus.CLOSED },
              { status: RfqStatus.PUBLISHED, deadline: { lte: new Date() } },
            ],
          });
        } else {
          andConditions.push({ status });
        }
      }
    } else if (userRole === Role.ADMIN) {
      if (status) {
        if (status === RfqStatus.PUBLISHED) {
          andConditions.push({
            status: RfqStatus.PUBLISHED,
            deadline: { gt: new Date() },
          });
        } else if (status === RfqStatus.CLOSED) {
          andConditions.push({
            OR: [
              { status: RfqStatus.CLOSED },
              { status: RfqStatus.PUBLISHED, deadline: { lte: new Date() } },
            ],
          });
        } else {
          andConditions.push({ status });
        }
      }
    }

    // 2. Category Filter (case-insensitive partial match)
    if (category && category.trim()) {
      andConditions.push({
        category: { contains: category.trim(), mode: 'insensitive' },
      });
    }

    // 3. Location Filter (case-insensitive partial match)
    if (deliveryLocation && deliveryLocation.trim()) {
      andConditions.push({
        deliveryLocation: { contains: deliveryLocation.trim(), mode: 'insensitive' },
      });
    }

    // 4. Keyword Search
    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
          { deliveryLocation: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.RFQWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [total, rawRfqs] = await Promise.all([
      prisma.rFQ.count({ where }),
      prisma.rFQ.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          lineItems: true,
          buyer: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { quotes: true },
          },
        },
      }),
    ]);

    // Check effective status for each returned item
    const rfqs = await Promise.all(
      rawRfqs.map(async (rfq) => {
        if (rfq.status === RfqStatus.PUBLISHED && new Date() > new Date(rfq.deadline)) {
          // If expired, return CLOSED as effective status
          return {
            ...rfq,
            status: RfqStatus.CLOSED,
          };
        }
        return rfq;
      })
    );

    return {
      data: rfqs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
