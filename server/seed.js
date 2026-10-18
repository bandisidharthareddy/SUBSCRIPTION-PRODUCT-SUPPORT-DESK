import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from './config/db.js';
import {
  User,
  Organization,
  Membership,
  Plan,
  Entitlement,
  HelpArticle,
  Incident,
  Ticket,
  Assignment,
  ToolRun
} from './models/index.js';

export async function runSeed() {
  await connectDB();

  // Clear collections
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    Membership.deleteMany({}),
    Plan.deleteMany({}),
    Entitlement.deleteMany({}),
    HelpArticle.deleteMany({}),
    Incident.deleteMany({}),
    Ticket.deleteMany({}),
    Assignment.deleteMany({}),
    ToolRun.deleteMany({})
  ]);

  // Seed Plans
  const basic = await Plan.create({
    name: 'Basic',
    limits: { teamMembers: 5, monthlyExports: 0 },
    features: ['dashboard', 'basic-reports']
  });

  const pro = await Plan.create({
    name: 'Pro',
    limits: { teamMembers: 25, monthlyExports: 500 },
    features: ['dashboard', 'basic-reports', 'export', 'advanced-reports']
  });

  // Seed Organizations
  const acme = await Organization.create({
    name: 'Acme Analytics',
    slug: 'acme',
    planId: basic._id
  });

  const north = await Organization.create({
    name: 'Northstar Labs',
    slug: 'northstar',
    planId: pro._id
  });

  // Seed Users
  const passwordHash = await bcrypt.hash('DemoPass!234', 12);
  const users = await User.create([
    {
      name: 'Alex Customer',
      email: 'customer@acme.test',
      passwordHash,
      role: 'customer',
      orgId: acme._id,
      emailVerified: true
    },
    {
      name: 'Sam Customer',
      email: 'customer@northstar.test',
      passwordHash,
      role: 'customer',
      orgId: north._id,
      emailVerified: true
    },
    {
      name: 'Taylor Specialist',
      email: 'specialist@support.test',
      passwordHash,
      role: 'specialist',
      emailVerified: true
    },
    {
      name: 'Jordan Knowledge',
      email: 'knowledge@support.test',
      passwordHash,
      role: 'knowledge_manager',
      emailVerified: true
    },
    {
      name: 'Morgan Supervisor',
      email: 'supervisor@support.test',
      passwordHash,
      role: 'supervisor',
      emailVerified: true
    }
  ]);

  // Seed Memberships
  await Membership.create([
    {
      user: users[0]._id,
      org: acme._id,
      role: 'admin',
      status: 'active'
    },
    {
      user: users[1]._id,
      org: north._id,
      role: 'admin',
      status: 'active'
    }
  ]);

  // Seed Entitlements
  await Entitlement.create([
    { orgId: acme._id, feature: 'export', allowed: false, limit: 0, used: 0, updatedAt: new Date() },
    { orgId: acme._id, feature: 'team-members', allowed: true, limit: 5, used: 5, updatedAt: new Date() },
    { orgId: acme._id, feature: 'basic-reports', allowed: true, limit: 20, used: 18, updatedAt: new Date() },
    { orgId: north._id, feature: 'export', allowed: true, limit: 500, used: 112, updatedAt: new Date() },
    { orgId: north._id, feature: 'team-members', allowed: true, limit: 25, used: 8, updatedAt: new Date() },
    { orgId: north._id, feature: 'advanced-reports', allowed: true, limit: 500, used: 112, updatedAt: new Date() }
  ]);

  // Seed Help Articles
  await HelpArticle.create([
    {
      title: 'Export reports by plan',
      slug: 'export-reports-by-plan',
      productVersion: '1.0',
      version: 1,
      status: 'published',
      tags: ['export', 'plan', 'limits'],
      body: 'Report export is available on the Pro plan. Basic organizations can view basic reports but cannot export downloadable files. An organization owner can review plan features in Settings > Plan. Contact support if the plan shown in the portal does not match your contract.',
      publishedAt: new Date()
    },
    {
      title: 'Resolve monthly export limits',
      slug: 'monthly-export-limits',
      productVersion: '1.0',
      version: 1,
      status: 'published',
      tags: ['export', 'limit', 'usage'],
      body: 'Pro plans include up to 500 report exports per billing month. Open Settings > Usage to review current usage. When the limit is reached, exports become available again after the usage window resets. Support staff must verify entitlement data before advising on account-specific limits.',
      publishedAt: new Date()
    },
    {
      title: 'Troubleshoot report generation',
      slug: 'troubleshoot-report-generation',
      productVersion: '1.0',
      version: 1,
      status: 'published',
      tags: ['reports', 'outage', 'export'],
      body: 'If report generation fails unexpectedly, check the public service status page and retry after any active incident is resolved. Record the report name, approximate time, and any error message. Do not repeatedly retry during an incident. If no incident is listed, create a support ticket with those details.',
      publishedAt: new Date()
    },
    {
      title: 'Invite team members',
      slug: 'invite-team-members',
      productVersion: '1.0',
      version: 1,
      status: 'published',
      tags: ['team', 'members', 'limit'],
      body: 'Open Settings > Team and choose Invite member. The number of active seats depends on the organization plan. Remove inactive users before inviting another member. If the displayed seat count appears incorrect, contact support with the organization name and approximate active seat count.',
      publishedAt: new Date()
    }
  ]);

  // Seed Incident
  const incident = await Incident.create({
    title: 'Intermittent report export failures',
    feature: 'export',
    status: 'investigating',
    severity: 'major',
    summary: 'Some report export requests are failing intermittently. Engineering is investigating; avoid assuming an individual account is at fault until the incident is checked.',
    startedAt: new Date(Date.now() - 35 * 60000),
    updatedAt: new Date(),
    public: true
  });

  // Seed Sample Ticket
  const ticket = await Ticket.create({
    orgId: acme._id,
    createdBy: users[0]._id,
    subject: 'Team cannot export reports',
    question: 'Why can’t my team export this report?',
    status: 'open',
    priority: 'normal',
    assignedTo: users[2]._id,
    relatedIncidentIds: [incident._id],
    conversation: [
      {
        role: 'customer',
        content: 'Why can’t my team export this report?',
        createdAt: new Date()
      }
    ]
  });

  return { users, orgs: [acme, north], ticket, incident };
}

if (process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(({ ticket }) => {
      console.log('Seed complete. Demo password for all accounts: DemoPass!234');
      console.log('Ticket ID:', String(ticket._id));
      return disconnectDB();
    })
    .catch(err => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
