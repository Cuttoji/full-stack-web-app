import { PrismaClient, Role, SubUnitType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // Create Departments
  const salesDept = await prisma.department.upsert({
    where: { name: 'ฝ่ายขาย' },
    update: {},
    create: { name: 'ฝ่ายขาย' },
  });

  const financeDept = await prisma.department.upsert({
    where: { name: 'ฝ่ายการเงิน' },
    update: {},
    create: { name: 'ฝ่ายการเงิน' },
  });

  const techDept = await prisma.department.upsert({
    where: { name: 'แผนกช่าง' },
    update: {},
    create: { name: 'แผนกช่าง' },
  });

  const customerServiceDept = await prisma.department.upsert({
    where: { name: 'ฝ่ายบริการลูกค้า' },
    update: {},
    create: { name: 'ฝ่ายบริการลูกค้า' },
  });

  console.log('✅ Departments created');

  // Create Sub-Units for Tech Department
  const rentalUnit = await prisma.subUnit.upsert({
    where: { id: 'sub-1' },
    update: {},
    create: {
      id: 'sub-1',
      name: 'ทีมเครื่องเช่า',
      type: SubUnitType.RENTAL,
      departmentId: techDept.id,
    },
  });

  const installUnit = await prisma.subUnit.upsert({
    where: { id: 'sub-2' },
    update: {},
    create: {
      id: 'sub-2',
      name: 'ทีมติดตั้ง',
      type: SubUnitType.INSTALLATION,
      departmentId: techDept.id,
    },
  });

  const printerUnit = await prisma.subUnit.upsert({
    where: { id: 'sub-3' },
    update: {},
    create: {
      id: 'sub-3',
      name: 'ทีมปริ้นเตอร์',
      type: SubUnitType.PRINTER,
      departmentId: techDept.id,
    },
  });

  const itUnit = await prisma.subUnit.upsert({
    where: { id: 'sub-4' },
    update: {},
    create: {
      id: 'sub-4',
      name: 'ทีมไอที',
      type: SubUnitType.IT,
      departmentId: techDept.id,
    },
  });

  console.log('✅ Sub-units created');

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Admin User (Top Level)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      employeeId: 'EMP001',
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'นายสมชาย ผู้บริหาร',
      phone: '081-234-5678',
      role: Role.ADMIN,
    },
  });

  // 2. Create Customer Service
  const customerService = await prisma.user.upsert({
    where: { email: 'cs@example.com' },
    update: {},
    create: {
      employeeId: 'CS001',
      email: 'cs@example.com',
      password: hashedPassword,
      name: 'สมศรี บริการดี',
      phone: '081-111-1111',
      role: Role.CUSTOMER_SERVICE,
      departmentId: customerServiceDept.id,
      supervisorId: admin.id,
    },
  });

  // 3. Create Finance Leader
  const financeLeader = await prisma.user.upsert({
    where: { email: 'finance-leader@example.com' },
    update: {},
    create: {
      employeeId: 'FIN001',
      email: 'finance-leader@example.com',
      password: hashedPassword,
      name: 'วิไล การเงินดี',
      phone: '081-222-2222',
      role: Role.FINANCE_LEADER,
      departmentId: financeDept.id,
      supervisorId: admin.id,
    },
  });

  // 4. Create Finance Staff
  const finance = await prisma.user.upsert({
    where: { email: 'finance@example.com' },
    update: {},
    create: {
      employeeId: 'FIN002',
      email: 'finance@example.com',
      password: hashedPassword,
      name: 'พิมพา การเงิน',
      phone: '081-222-3333',
      role: Role.FINANCE,
      departmentId: financeDept.id,
      supervisorId: financeLeader.id,
    },
  });

  // 5. Create Sales Leader
  const salesLeader = await prisma.user.upsert({
    where: { email: 'sales-leader@example.com' },
    update: {},
    create: {
      employeeId: 'SAL001',
      email: 'sales-leader@example.com',
      password: hashedPassword,
      name: 'สมชาติ ขายดี',
      phone: '081-333-1111',
      role: Role.SALES_LEADER,
      departmentId: salesDept.id,
      supervisorId: admin.id,
    },
  });

  // 6. Create Sales Staff
  const sales = await prisma.user.upsert({
    where: { email: 'sales@example.com' },
    update: {},
    create: {
      employeeId: 'SAL002',
      email: 'sales@example.com',
      password: hashedPassword,
      name: 'สมพร ขายดี',
      phone: '081-234-5683',
      role: Role.SALES,
      departmentId: salesDept.id,
      supervisorId: salesLeader.id,
    },
  });

  // 7. Create Head Tech
  const headTech = await prisma.user.upsert({
    where: { email: 'headtech@example.com' },
    update: {},
    create: {
      employeeId: 'TECH001',
      email: 'headtech@example.com',
      password: hashedPassword,
      name: 'สมชาย ช่างเอก',
      phone: '081-234-5679',
      role: Role.HEAD_TECH,
      departmentId: techDept.id,
      supervisorId: admin.id,
    },
  });

  // 8. Create Leaders
  const leaderRental = await prisma.user.upsert({
    where: { email: 'leader-rental@example.com' },
    update: {},
    create: {
      employeeId: 'TECH002',
      email: 'leader-rental@example.com',
      password: hashedPassword,
      name: 'พรชัย เครื่องเช่า',
      phone: '081-234-5680',
      role: Role.LEADER,
      departmentId: techDept.id,
      subUnitId: rentalUnit.id,
      supervisorId: headTech.id,
    },
  });

  const leaderInstall = await prisma.user.upsert({
    where: { email: 'leader-install@example.com' },
    update: {},
    create: {
      employeeId: 'TECH003',
      email: 'leader-install@example.com',
      password: hashedPassword,
      name: 'สมพร ติดตั้งดี',
      phone: '081-444-1111',
      role: Role.LEADER,
      departmentId: techDept.id,
      subUnitId: installUnit.id,
      supervisorId: headTech.id,
    },
  });

  const leaderPrinter = await prisma.user.upsert({
    where: { email: 'leader-printer@example.com' },
    update: {},
    create: {
      employeeId: 'TECH004',
      email: 'leader-printer@example.com',
      password: hashedPassword,
      name: 'วิชัย ปริ้นเตอร์',
      phone: '081-444-2222',
      role: Role.LEADER,
      departmentId: techDept.id,
      subUnitId: printerUnit.id,
      supervisorId: headTech.id,
    },
  });

  const leaderIT = await prisma.user.upsert({
    where: { email: 'leader-it@example.com' },
    update: {},
    create: {
      employeeId: 'TECH005',
      email: 'leader-it@example.com',
      password: hashedPassword,
      name: 'พงศ์พัฒน์ ไอที',
      phone: '081-444-3333',
      role: Role.LEADER,
      departmentId: techDept.id,
      subUnitId: itUnit.id,
      supervisorId: headTech.id,
    },
  });

  // 9. Create Technicians
  const tech1 = await prisma.user.upsert({
    where: { email: 'tech1@example.com' },
    update: {},
    create: {
      employeeId: 'TECH006',
      email: 'tech1@example.com',
      password: hashedPassword,
      name: 'สมศักดิ์ ช่างเครื่องเช่า',
      phone: '081-234-5681',
      role: Role.TECH,
      departmentId: techDept.id,
      subUnitId: rentalUnit.id,
      supervisorId: leaderRental.id,
    },
  });

  const tech2 = await prisma.user.upsert({
    where: { email: 'tech2@example.com' },
    update: {},
    create: {
      employeeId: 'TECH007',
      email: 'tech2@example.com',
      password: hashedPassword,
      name: 'สมพร ช่างติดตั้ง',
      phone: '081-234-5682',
      role: Role.TECH,
      departmentId: techDept.id,
      subUnitId: installUnit.id,
      supervisorId: leaderInstall.id,
    },
  });

  const tech3 = await prisma.user.upsert({
    where: { email: 'tech3@example.com' },
    update: {},
    create: {
      employeeId: 'TECH008',
      email: 'tech3@example.com',
      password: hashedPassword,
      name: 'สมบูรณ์ ช่างปริ้นเตอร์',
      phone: '081-555-1111',
      role: Role.TECH,
      departmentId: techDept.id,
      subUnitId: printerUnit.id,
      supervisorId: leaderPrinter.id,
    },
  });

  const tech4 = await prisma.user.upsert({
    where: { email: 'tech4@example.com' },
    update: {},
    create: {
      employeeId: 'TECH009',
      email: 'tech4@example.com',
      password: hashedPassword,
      name: 'วิทยา ช่างไอที',
      phone: '081-555-2222',
      role: Role.TECH,
      departmentId: techDept.id,
      subUnitId: itUnit.id,
      supervisorId: leaderIT.id,
    },
  });

  console.log('✅ Users created (14 users with hierarchical structure)');

  // Cars - Add real cars from admin panel in production
  // Tasks - Create tasks through the application in production

  console.log('🎉 Seed completed successfully!');
  console.log('\n📝 Test Accounts (all password: password123):');
  console.log('  👑 ADMIN: admin@example.com');
  console.log('  📞 Customer Service: cs@example.com');
  console.log('  💰 Finance Leader: finance-leader@example.com');
  console.log('  💵 Finance: finance@example.com');
  console.log('  📊 Sales Leader: sales-leader@example.com');
  console.log('  💼 Sales: sales@example.com');
  console.log('  🔧 Head Tech: headtech@example.com');
  console.log('  👔 Leader (Rental): leader-rental@example.com');
  console.log('  👔 Leader (Install): leader-install@example.com');
  console.log('  👔 Leader (Printer): leader-printer@example.com');
  console.log('  👔 Leader (IT): leader-it@example.com');
  console.log('  🔨 Tech (Rental): tech1@example.com');
  console.log('  🔨 Tech (Install): tech2@example.com');
  console.log('  🔨 Tech (Printer): tech3@example.com');
  console.log('  🔨 Tech (IT): tech4@example.com');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
