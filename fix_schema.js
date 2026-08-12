
const fs = require('fs');
let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');
schema = schema.replace('provider = "postgresql"', 'provider = "sqlite"');
schema = schema.replace(/features\s+Json/g, 'features String');
schema = schema.replace(/gatewayResponse\s+Json\?/g, 'gatewayResponse String?');
schema = schema.replace(/details\s+Json\?/g, 'details String?');
schema = schema.replace(/changes\s+Json/g, 'changes String');
schema = schema.replace(/role\s+Role\s+@default\(FRANCHISEE\)/g, 'role String @default("FRANCHISEE")');
schema = schema.replace(/status\s+MachineStatus\s+@default\(INACTIVE\)/g, 'status String @default("INACTIVE")');
schema = schema.replace(/billingType\s+BillingType\s+@default\(MONTHLY\)/g, 'billingType String @default("MONTHLY")');
schema = schema.replace(/status\s+SubscriptionStatus\s+@default\(ACTIVE\)/g, 'status String @default("ACTIVE")');
schema = schema.replace(/status\s+PaymentStatus\s+@default\(PENDING\)/g, 'status String @default("PENDING")');
schema = schema.replace(/type\s+PaymentType/g, 'type String');
schema = schema.replace(/status\s+JobStatus\s+@default\(PENDING_PAYMENT\)/g, 'status String @default("PENDING_PAYMENT")');
schema = schema.replace(/enum\s+\w+\s+\{[\s\S]*?\}/g, '');
fs.writeFileSync('backend/prisma/schema.prisma', schema);
