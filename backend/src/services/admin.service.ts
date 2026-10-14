import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { AppError } from '../middleware/error.middleware';
import { Role, RfqStatus, QuoteStatus, EntityType, Prisma } from '@prisma/client';
import { AdminCreateUserInput, AdminUpdateUserInput } from '../validators/admin.validator';

export class AdminService {
  /**
   * List all system users with search, role filter, pagination, and relationship counts.
   */
  static async listUsers(params: {
    search?: string;
    role?: Role;
    page?: number;
    limit?: number;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (params.role) {
      where.role = params.role;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              rfqs: true,
              quotes: true,
              attachments: true,
            },
          },
        },
      }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new user account with any role.
   */
  static async createUser(input: AdminCreateUserInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new AppError(409, 'EMAIL_EXISTS', 'A user with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Update an existing user (name, email, role, or reset password).
   */
  static async updateUser(targetUserId: string, input: AdminUpdateUserInput) {
    const existing = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    if (input.email && input.email !== existing.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (emailConflict) {
        throw new AppError(409, 'EMAIL_EXISTS', 'Email address is already in use by another account');
      }
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (input.name) updateData.name = input.name;
    if (input.email) updateData.email = input.email;
    if (input.role) updateData.role = input.role;

    if (input.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(input.password, salt);
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            rfqs: true,
            quotes: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete a user account (with safeguard against deleting own account).
   */
  static async deleteUser(currentAdminId: string, targetUserId: string) {
    if (currentAdminId === targetUserId) {
      throw new AppError(400, 'SELF_DELETION_FORBIDDEN', 'You cannot delete your own administrative account');
    }

    const existing = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    return { message: 'User deleted successfully', deletedUserId: targetUserId };
  }

  /**
   * Comprehensive platform statistics & metrics for the "View Everything" oversight.
   */
  static async getPlatformStats() {
    const [
      totalUsers,
      buyersCount,
      vendorsCount,
      adminsCount,
      totalRfqs,
      draftRfqs,
      publishedRfqs,
      closedRfqs,
      awardedRfqs,
      totalQuotes,
      acceptedQuotes,
      shortlistedQuotes,
      rejectedQuotes,
      totalAttachments,
      rfqBudgetAgg,
      acceptedQuotesList,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.BUYER } }),
      prisma.user.count({ where: { role: Role.VENDOR } }),
      prisma.user.count({ where: { role: Role.ADMIN } }),
      prisma.rFQ.count(),
      prisma.rFQ.count({ where: { status: RfqStatus.DRAFT } }),
      prisma.rFQ.count({ where: { status: RfqStatus.PUBLISHED } }),
      prisma.rFQ.count({ where: { status: RfqStatus.CLOSED } }),
      prisma.rFQ.count({ where: { status: RfqStatus.AWARDED } }),
      prisma.quote.count(),
      prisma.quote.count({ where: { status: QuoteStatus.ACCEPTED } }),
      prisma.quote.count({ where: { status: QuoteStatus.SHORTLISTED } }),
      prisma.quote.count({ where: { status: QuoteStatus.REJECTED } }),
      prisma.attachment.count(),
      prisma.rFQ.aggregate({
        _sum: { budget: true },
      }),
      // Sum the total amounts of winning revisions
      prisma.quoteRevision.findMany({
        where: {
          quote: { status: QuoteStatus.ACCEPTED },
        },
        select: {
          totalAmount: true,
          revisionNumber: true,
          quote: { select: { currentRevisionNumber: true } },
        },
      }),
    ]);

    // Calculate awarded spend only from accepted revision
    const totalAwardedSpend = acceptedQuotesList
      .filter((rev) => rev.revisionNumber === rev.quote.currentRevisionNumber)
      .reduce((sum, rev) => sum + Number(rev.totalAmount), 0);

    return {
      users: {
        total: totalUsers,
        buyers: buyersCount,
        vendors: vendorsCount,
        admins: adminsCount,
      },
      rfqs: {
        total: totalRfqs,
        draft: draftRfqs,
        published: publishedRfqs,
        closed: closedRfqs,
        awarded: awardedRfqs,
        totalBudget: Number(rfqBudgetAgg._sum.budget || 0),
      },
      quotes: {
        total: totalQuotes,
        accepted: acceptedQuotes,
        shortlisted: shortlistedQuotes,
        rejected: rejectedQuotes,
        submitted: totalQuotes - acceptedQuotes - shortlistedQuotes - rejectedQuotes,
        totalAwardedSpend,
      },
      attachments: {
        total: totalAttachments,
      },
    };
  }

  /**
   * List all quotes submitted platform-wide (Admin oversight).
   */
  static async listAllQuotes(params: {
    status?: QuoteStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.QuoteWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      where.OR = [
        { rfq: { title: { contains: params.search, mode: 'insensitive' } } },
        { vendor: { name: { contains: params.search, mode: 'insensitive' } } },
        { vendor: { email: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [total, quotes] = await Promise.all([
      prisma.quote.count({ where }),
      prisma.quote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          rfq: {
            select: {
              id: true,
              title: true,
              category: true,
              status: true,
              deadline: true,
              budget: true,
              buyer: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          vendor: {
            select: { id: true, name: true, email: true },
          },
          revisions: {
            orderBy: { revisionNumber: 'desc' },
            take: 1,
            select: {
              id: true,
              revisionNumber: true,
              totalAmount: true,
              deliveryDays: true,
              notes: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    return {
      quotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * List platform-wide status audit logs with filters.
   */
  static async listAuditLogs(params: {
    entityType?: EntityType;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.StatusHistoryWhereInput = {};

    if (params.entityType) {
      where.entityType = params.entityType;
    }

    if (params.search) {
      where.OR = [
        { reason: { contains: params.search, mode: 'insensitive' } },
        { fromStatus: { contains: params.search, mode: 'insensitive' } },
        { toStatus: { contains: params.search, mode: 'insensitive' } },
        { changedBy: { name: { contains: params.search, mode: 'insensitive' } } },
        { changedBy: { email: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.statusHistory.count({ where }),
      prisma.statusHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          changedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    const quoteIds = logs
      .filter((l) => l.entityType === 'QUOTE')
      .map((l) => l.entityId);
    const rfqIds = logs
      .filter((l) => l.entityType === 'RFQ')
      .map((l) => l.entityId);

    const [quotes, rfqs] = await Promise.all([
      quoteIds.length > 0
        ? prisma.quote.findMany({
            where: { id: { in: quoteIds } },
            include: {
              vendor: { select: { id: true, name: true, email: true } },
              rfq: { select: { id: true, title: true } },
              revisions: {
                orderBy: { revisionNumber: 'desc' },
                take: 1,
                select: { revisionNumber: true, totalAmount: true, deliveryDays: true },
              },
            },
          })
        : [],
      rfqIds.length > 0
        ? prisma.rFQ.findMany({
            where: { id: { in: rfqIds } },
            select: { id: true, title: true },
          })
        : [],
    ]);

    const quoteMap = new Map(
      quotes.map((q) => [
        q.id,
        {
          id: q.id,
          vendorId: q.vendorId,
          vendorName: q.vendor.name,
          vendorEmail: q.vendor.email,
          rfqId: q.rfq.id,
          rfqTitle: q.rfq.title,
          totalAmount: q.revisions[0]?.totalAmount ? Number(q.revisions[0].totalAmount) : null,
          deliveryDays: q.revisions[0]?.deliveryDays || null,
          revisionNumber: q.revisions[0]?.revisionNumber || q.currentRevisionNumber,
        },
      ])
    );

    const rfqMap = new Map(rfqs.map((r) => [r.id, { id: r.id, title: r.title }]));

    const enrichedLogs = logs.map((log) => {
      const targetQuote = log.entityType === 'QUOTE' ? quoteMap.get(log.entityId) || null : null;
      const targetRfq =
        log.entityType === 'RFQ'
          ? rfqMap.get(log.entityId) || null
          : targetQuote
          ? { id: targetQuote.rfqId, title: targetQuote.rfqTitle }
          : null;

      return {
        ...log,
        targetQuote,
        targetRfq,
      };
    });

    return {
      logs: enrichedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
