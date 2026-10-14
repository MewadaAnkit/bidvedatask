import { PrismaClient, Role, RfqStatus, QuoteStatus, EntityType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log(' Starting database seed...');

  const userCount = await prisma.user.count();
  if (userCount > 0 && process.env.FORCE_SEED !== 'true') {
    console.log(` Database already seeded (${userCount} users found). Skipping seed to preserve data.`);
    return;
  }

  // Clean existing data in reverse dependency order
  await prisma.statusHistory.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.quoteRevisionPrice.deleteMany();
  await prisma.quoteRevision.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.rFQLineItem.deleteMany();
  await prisma.rFQ.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Seed Users (1 Admin, 2 Buyers, 3 Vendors) with deterministic UUIDs
  await prisma.user.create({
    data: {
      id: 'a0000000-0000-0000-0000-000000000001',
      email: 'admin@bidveda.com',
      passwordHash,
      name: 'System Administrator',
      role: Role.ADMIN,
    },
  });

  const buyer1 = await prisma.user.create({
    data: {
      id: 'b0000000-0000-0000-0000-000000000001',
      email: 'buyer1@company.com',
      passwordHash,
      name: 'Acme Procurement Lead',
      role: Role.BUYER,
    },
  });

  const buyer2 = await prisma.user.create({
    data: {
      id: 'b0000000-0000-0000-0000-000000000002',
      email: 'buyer2@company.com',
      passwordHash,
      name: 'Apex Infrastructure Buyer',
      role: Role.BUYER,
    },
  });

  const vendor1 = await prisma.user.create({
    data: {
      id: 'c0000000-0000-0000-0000-000000000001',
      email: 'vendor1@tech.com',
      passwordHash,
      name: 'Precision Metalworks & Fasteners',
      role: Role.VENDOR,
    },
  });

  const vendor2 = await prisma.user.create({
    data: {
      id: 'c0000000-0000-0000-0000-000000000002',
      email: 'vendor2@build.com',
      passwordHash,
      name: 'Global Industrial Supplies',
      role: Role.VENDOR,
    },
  });

  const vendor3 = await prisma.user.create({
    data: {
      id: 'c0000000-0000-0000-0000-000000000003',
      email: 'vendor3@supply.com',
      passwordHash,
      name: 'Apex Mechanical & Electrical Parts',
      role: Role.VENDOR,
    },
  });

  console.log(' Seeded 6 users (1 Admin, 2 Buyers, 3 Vendors)');

  // 2. RFQ 1: DRAFT (Buyer 1)
  const rfq1 = await prisma.rFQ.create({
    data: {
      buyerId: buyer1.id,
      title: 'Industrial Bearings & Bronze Bushings Supply',
      description: 'Annual requirement of high-precision ball bearings and bronze bushings for assembly lines.',
      category: 'Machinery',
      deliveryLocation: 'Pune, Maharashtra',
      budget: '250000.00',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days ahead
      status: RfqStatus.DRAFT,
      lineItems: {
        create: [
          { name: '6205-2RS Deep Groove Ball Bearing', quantity: '500.00', unit: 'PCS' },
          { name: 'Bronze Flanged Bushing 25mm ID', quantity: '250.00', unit: 'PCS' },
        ],
      },
    },
  });

  await prisma.statusHistory.create({
    data: {
      changedById: buyer1.id,
      entityType: EntityType.RFQ,
      entityId: rfq1.id,
      fromStatus: 'NONE',
      toStatus: RfqStatus.DRAFT,
      reason: 'Initial RFQ creation in draft mode',
    },
  });

  // 3. RFQ 2: PUBLISHED & Open (Buyer 1)
  const rfq2 = await prisma.rFQ.create({
    data: {
      buyerId: buyer1.id,
      title: 'High-Tensile Structural Steel Fasteners',
      description: 'Grade 8.8 hex bolts and heavy hex nuts for heavy plant fabrication.',
      category: 'Hardware',
      deliveryLocation: 'Bengaluru, Karnataka',
      budget: '480000.00',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days ahead
      status: RfqStatus.PUBLISHED,
      lineItems: {
        create: [
          { name: 'Grade 8.8 M16x80 Hex Bolts', quantity: '2000.00', unit: 'PCS' },
          { name: 'Grade 8 Heavy Hex Nuts M16', quantity: '2000.00', unit: 'PCS' },
          { name: 'M16 Hardened Flat Washers', quantity: '4000.00', unit: 'PCS' },
        ],
      },
    },
    include: { lineItems: true },
  });

  await prisma.statusHistory.createMany({
    data: [
      {
        changedById: buyer1.id,
        entityType: EntityType.RFQ,
        entityId: rfq2.id,
        fromStatus: 'NONE',
        toStatus: RfqStatus.DRAFT,
        reason: 'RFQ created',
      },
      {
        changedById: buyer1.id,
        entityType: EntityType.RFQ,
        entityId: rfq2.id,
        fromStatus: RfqStatus.DRAFT,
        toStatus: RfqStatus.PUBLISHED,
        reason: 'RFQ released to public bidding',
      },
    ],
  });

  // Vendor 1 submits quote for RFQ 2 (Revision 1)
  // Quantities: 2000, 2000, 4000
  // Prices: 120.00 * 2000 = 240,000; 45.00 * 2000 = 90,000; 15.00 * 4000 = 60,000 => Total = 390,000
  const quote1Rfq2 = await prisma.quote.create({
    data: {
      rfqId: rfq2.id,
      vendorId: vendor1.id,
      status: QuoteStatus.SUBMITTED,
      currentRevisionNumber: 1,
    },
  });

  await prisma.quoteRevision.create({
    data: {
      quoteId: quote1Rfq2.id,
      revisionNumber: 1,
      deliveryDays: 10,
      notes: 'Ex-stock available for immediate dispatch from Bengaluru depot.',
      totalAmount: '390000.00',
      prices: {
        create: [
          { rfqLineItemId: rfq2.lineItems[0].id, unitPrice: '120.00', lineTotal: '240000.00' },
          { rfqLineItemId: rfq2.lineItems[1].id, unitPrice: '45.00', lineTotal: '90000.00' },
          { rfqLineItemId: rfq2.lineItems[2].id, unitPrice: '15.00', lineTotal: '60000.00' },
        ],
      },
    },
  });

  await prisma.statusHistory.create({
    data: {
      changedById: vendor1.id,
      entityType: EntityType.QUOTE,
      entityId: quote1Rfq2.id,
      fromStatus: 'NONE',
      toStatus: QuoteStatus.SUBMITTED,
      reason: 'Quote submitted (Revision 1)',
    },
  });

  // Vendor 2 submits quote for RFQ 2 with 2 Revisions!
  const quote2Rfq2 = await prisma.quote.create({
    data: {
      rfqId: rfq2.id,
      vendorId: vendor2.id,
      status: QuoteStatus.SUBMITTED,
      currentRevisionNumber: 2,
    },
  });

  // Revision 1 for Vendor 2: Total 420,000
  await prisma.quoteRevision.create({
    data: {
      quoteId: quote2Rfq2.id,
      revisionNumber: 1,
      deliveryDays: 14,
      notes: 'Standard manufacturing lead time.',
      totalAmount: '420000.00',
      prices: {
        create: [
          { rfqLineItemId: rfq2.lineItems[0].id, unitPrice: '130.00', lineTotal: '260000.00' },
          { rfqLineItemId: rfq2.lineItems[1].id, unitPrice: '50.00', lineTotal: '100000.00' },
          { rfqLineItemId: rfq2.lineItems[2].id, unitPrice: '15.00', lineTotal: '60000.00' },
        ],
      },
    },
  });

  // Revision 2 for Vendor 2: Discounted Total 375,000
  await prisma.quoteRevision.create({
    data: {
      quoteId: quote2Rfq2.id,
      revisionNumber: 2,
      deliveryDays: 8,
      notes: 'Revised pricing with bulk volume discount and expedited air transit.',
      totalAmount: '375000.00',
      prices: {
        create: [
          { rfqLineItemId: rfq2.lineItems[0].id, unitPrice: '115.00', lineTotal: '230000.00' },
          { rfqLineItemId: rfq2.lineItems[1].id, unitPrice: '42.50', lineTotal: '85000.00' },
          { rfqLineItemId: rfq2.lineItems[2].id, unitPrice: '15.00', lineTotal: '60000.00' },
        ],
      },
    },
  });

  await prisma.statusHistory.create({
    data: {
      changedById: vendor2.id,
      entityType: EntityType.QUOTE,
      entityId: quote2Rfq2.id,
      fromStatus: 'NONE',
      toStatus: QuoteStatus.SUBMITTED,
      reason: 'Quote submitted and revised to Rev 2',
    },
  });

  // 4. RFQ 3: Deadline passed / Expired (Buyer 2)
  const rfq3 = await prisma.rFQ.create({
    data: {
      buyerId: buyer2.id,
      title: 'Hydraulic Hoses and Quick Release Couplings',
      description: 'Hydraulic assemblies rated for 350 bar operating pressure.',
      category: 'Hydraulics',
      deliveryLocation: 'Chennai, Tamil Nadu',
      budget: '180000.00',
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days in the past
      status: RfqStatus.PUBLISHED, // Effective status is CLOSED due to past deadline
      lineItems: {
        create: [
          { name: '1/2 inch 2-Wire Hydraulic Hose', quantity: '100.00', unit: 'METERS' },
          { name: 'ISO-A Quick Disconnect Coupler 1/2 inch', quantity: '40.00', unit: 'SETS' },
        ],
      },
    },
    include: { lineItems: true },
  });

  const quote1Rfq3 = await prisma.quote.create({
    data: {
      rfqId: rfq3.id,
      vendorId: vendor2.id,
      status: QuoteStatus.SHORTLISTED,
      currentRevisionNumber: 1,
    },
  });

  await prisma.quoteRevision.create({
    data: {
      quoteId: quote1Rfq3.id,
      revisionNumber: 1,
      deliveryDays: 5,
      notes: 'Tested and certified up to 400 bar burst resistance.',
      totalAmount: '165000.00',
      prices: {
        create: [
          { rfqLineItemId: rfq3.lineItems[0].id, unitPrice: '1150.00', lineTotal: '115000.00' },
          { rfqLineItemId: rfq3.lineItems[1].id, unitPrice: '1250.00', lineTotal: '50000.00' },
        ],
      },
    },
  });

  const quote2Rfq3 = await prisma.quote.create({
    data: {
      rfqId: rfq3.id,
      vendorId: vendor3.id,
      status: QuoteStatus.SUBMITTED,
      currentRevisionNumber: 1,
    },
  });

  await prisma.quoteRevision.create({
    data: {
      quoteId: quote2Rfq3.id,
      revisionNumber: 1,
      deliveryDays: 7,
      notes: 'Imported European fittings included.',
      totalAmount: '178000.00',
      prices: {
        create: [
          { rfqLineItemId: rfq3.lineItems[0].id, unitPrice: '1200.00', lineTotal: '120000.00' },
          { rfqLineItemId: rfq3.lineItems[1].id, unitPrice: '1450.00', lineTotal: '58000.00' },
        ],
      },
    },
  });

  // 5. RFQ 4: AWARDED (Buyer 1)
  const rfq4 = await prisma.rFQ.create({
    data: {
      buyerId: buyer1.id,
      title: 'Electrical Distribution Panels & Breakers',
      description: 'Factory power distribution boards compliant with IEC 61439.',
      category: 'Electrical',
      deliveryLocation: 'Mumbai, Maharashtra',
      budget: '750000.00',
      deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days in past
      status: RfqStatus.AWARDED,
      lineItems: {
        create: [
          { name: '63A 4-Pole MCB 10kA', quantity: '50.00', unit: 'PCS' },
          { name: 'IP65 Weatherproof Distribution Enclosure', quantity: '10.00', unit: 'UNITS' },
        ],
      },
    },
    include: { lineItems: true },
  });

  const winningQuote = await prisma.quote.create({
    data: {
      rfqId: rfq4.id,
      vendorId: vendor1.id,
      status: QuoteStatus.ACCEPTED,
      currentRevisionNumber: 1,
    },
  });

  await prisma.quoteRevision.create({
    data: {
      quoteId: winningQuote.id,
      revisionNumber: 1,
      deliveryDays: 12,
      notes: 'Schneider Electric components with 2-year warranty.',
      totalAmount: '680000.00',
      prices: {
        create: [
          { rfqLineItemId: rfq4.lineItems[0].id, unitPrice: '4600.00', lineTotal: '230000.00' },
          { rfqLineItemId: rfq4.lineItems[1].id, unitPrice: '45000.00', lineTotal: '450000.00' },
        ],
      },
    },
  });

  const losingQuote = await prisma.quote.create({
    data: {
      rfqId: rfq4.id,
      vendorId: vendor3.id,
      status: QuoteStatus.REJECTED,
      currentRevisionNumber: 1,
    },
  });

  await prisma.quoteRevision.create({
    data: {
      quoteId: losingQuote.id,
      revisionNumber: 1,
      deliveryDays: 20,
      notes: 'Standard panels.',
      totalAmount: '720000.00',
      prices: {
        create: [
          { rfqLineItemId: rfq4.lineItems[0].id, unitPrice: '4800.00', lineTotal: '240000.00' },
          { rfqLineItemId: rfq4.lineItems[1].id, unitPrice: '48000.00', lineTotal: '480000.00' },
        ],
      },
    },
  });

  // Link awarded quote
  await prisma.rFQ.update({
    where: { id: rfq4.id },
    data: { awardedQuoteId: winningQuote.id },
  });

  await prisma.statusHistory.createMany({
    data: [
      {
        changedById: buyer1.id,
        entityType: EntityType.RFQ,
        entityId: rfq4.id,
        fromStatus: RfqStatus.PUBLISHED,
        toStatus: RfqStatus.CLOSED,
        reason: 'Deadline passed',
      },
      {
        changedById: buyer1.id,
        entityType: EntityType.RFQ,
        entityId: rfq4.id,
        fromStatus: RfqStatus.CLOSED,
        toStatus: RfqStatus.AWARDED,
        reason: 'Awarded to Precision Metalworks (Vendor 1)',
      },
      {
        changedById: buyer1.id,
        entityType: EntityType.QUOTE,
        entityId: winningQuote.id,
        fromStatus: QuoteStatus.SUBMITTED,
        toStatus: QuoteStatus.ACCEPTED,
        reason: 'Quote accepted and awarded',
      },
      {
        changedById: buyer1.id,
        entityType: EntityType.QUOTE,
        entityId: losingQuote.id,
        fromStatus: QuoteStatus.SUBMITTED,
        toStatus: QuoteStatus.REJECTED,
        reason: 'Quote rejected due to competitor award',
      },
    ],
  });

  console.log(' Database seed completed successfully!');
  console.log(' Seeded RFQs in DRAFT, PUBLISHED (active & expired), and AWARDED states.');
}

main()
  .catch((e) => {
    console.error(' Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
