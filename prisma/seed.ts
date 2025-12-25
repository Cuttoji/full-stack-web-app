import { PrismaClient, Role, SubUnitType, CarStatus, TaskStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create Departments
  const salesDept = await prisma.department.upsert({
    where: { name: 'ฝ่ายขาย' },
    update: {},
    create: { name: 'ฝ่ายขาย' },
  });

  const financeDept = await prisma.department.upsert({
    where: { name: 'การเงิน' },
    update: {},
    create: { name: 'การเงิน' },
  });

  const techDept = await prisma.department.upsert({
    where: { name: 'แผนกช่าง' },
    update: {},
    create: { name: 'แผนกช่าง' },
  });

  console.log('✅ Departments created');

  // Create Sub-Units for Tech Department
  const rentalUnit = await prisma.subUnit.upsert({
    where: { id: 'rental-unit' },
    update: {},
    create: {
      id: 'rental-unit',
      name: 'เครื่องเช่า',
      type: SubUnitType.RENTAL,
      departmentId: techDept.id,
    },
  });

  const installUnit = await prisma.subUnit.upsert({
    where: { id: 'install-unit' },
    update: {},
    create: {
      id: 'install-unit',
      name: 'ติดตั้ง',
      type: SubUnitType.INSTALLATION,
      departmentId: techDept.id,
    },
  });

  const printerUnit = await prisma.subUnit.upsert({
    where: { id: 'printer-unit' },
    update: {},
    create: {
      id: 'printer-unit',
      name: 'ปริ้นเตอร์',
      type: SubUnitType.PRINTER,
      departmentId: techDept.id,
    },
  });

  console.log('✅ Sub-units created');

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      employeeId: 'EMP001',
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'ผู้ดูแลระบบ',
      role: Role.ADMIN,
      departmentId: techDept.id,
    },
  });

  // Create Finance User
  const finance = await prisma.user.upsert({
    where: { email: 'finance@example.com' },
    update: {},
    create: {
      employeeId: 'EMP002',
      email: 'finance@example.com',
      password: hashedPassword,
      name: 'พนักงานการเงิน',
      role: Role.FINANCE,
      departmentId: financeDept.id,
    },
  });

  // Create Sales User
  const sales = await prisma.user.upsert({
    where: { email: 'sales@example.com' },
    update: {},
    create: {
      employeeId: 'EMP003',
      email: 'sales@example.com',
      password: hashedPassword,
      name: 'พนักงานขาย',
      role: Role.SALES,
      departmentId: salesDept.id,
    },
  });

  // Create Head Tech User
  const headTech = await prisma.user.upsert({
    where: { email: 'headtech@example.com' },
    update: {},
    create: {
      employeeId: 'EMP004',
      email: 'headtech@example.com',
      password: hashedPassword,
      name: 'หัวหน้าแผนกช่าง',
      role: Role.HEAD_TECH,
      departmentId: techDept.id,
    },
  });

  // Create Leader Users
  const leaderRental = await prisma.user.upsert({
    where: { email: 'leader-rental@example.com' },
    update: {},
    create: {
      employeeId: 'EMP005',
      email: 'leader-rental@example.com',
      password: hashedPassword,
      name: 'หัวหน้าทีมเครื่องเช่า',
      role: Role.LEADER,
      departmentId: techDept.id,
      subUnitId: rentalUnit.id,
    },
  });

  const leaderInstall = await prisma.user.upsert({
    where: { email: 'leader-install@example.com' },
    update: {},
    create: {
      employeeId: 'EMP006',
      email: 'leader-install@example.com',
      password: hashedPassword,
      name: 'หัวหน้าทีมติดตั้ง',
      role: Role.LEADER,
      departmentId: techDept.id,
      subUnitId: installUnit.id,
    },
  });

  const leaderPrinter = await prisma.user.upsert({
    where: { email: 'leader-printer@example.com' },
    update: {},
    create: {
      employeeId: 'EMP007',
      email: 'leader-printer@example.com',
      password: hashedPassword,
      name: 'หัวหน้าทีมปริ้นเตอร์',
      role: Role.LEADER,
      departmentId: techDept.id,
      subUnitId: printerUnit.id,
    },
  });

  // Create Technicians
  const tech1 = await prisma.user.upsert({
    where: { email: 'tech1@example.com' },
    update: {},
    create: {
      employeeId: 'EMP008',
      email: 'tech1@example.com',
      password: hashedPassword,
      name: 'ช่างเครื่องเช่า 1',
      role: Role.TECH,
      departmentId: techDept.id,
      subUnitId: rentalUnit.id,
    },
  });

  const tech2 = await prisma.user.upsert({
    where: { email: 'tech2@example.com' },
    update: {},
    create: {
      employeeId: 'EMP009',
      email: 'tech2@example.com',
      password: hashedPassword,
      name: 'ช่างติดตั้ง 1',
      role: Role.TECH,
      departmentId: techDept.id,
      subUnitId: installUnit.id,
    },
  });

  const tech3 = await prisma.user.upsert({
    where: { email: 'tech3@example.com' },
    update: {},
    create: {
      employeeId: 'EMP010',
      email: 'tech3@example.com',
      password: hashedPassword,
      name: 'ช่างปริ้นเตอร์ 1',
      role: Role.TECH,
      departmentId: techDept.id,
      subUnitId: printerUnit.id,
    },
  });

  console.log('✅ Users created');

  // Create Cars
  const car1 = await prisma.car.upsert({
    where: { plateNumber: 'กข-1234' },
    update: {},
    create: {
      plateNumber: 'กข-1234',
      name: 'รถกระบะ 1',
      type: 'กระบะ',
      brand: 'Toyota',
      model: 'Hilux',
      year: 2022,
      status: CarStatus.AVAILABLE,
    },
  });

  const car2 = await prisma.car.upsert({
    where: { plateNumber: 'กค-5678' },
    update: {},
    create: {
      plateNumber: 'กค-5678',
      name: 'รถตู้ 1',
      type: 'รถตู้',
      brand: 'Toyota',
      model: 'Commuter',
      year: 2021,
      status: CarStatus.AVAILABLE,
    },
  });

  const car3 = await prisma.car.upsert({
    where: { plateNumber: 'กง-9012' },
    update: {},
    create: {
      plateNumber: 'กง-9012',
      name: 'รถเก๋ง 1',
      type: 'เก๋ง',
      brand: 'Honda',
      model: 'City',
      year: 2023,
      status: CarStatus.AVAILABLE,
    },
  });

  console.log('✅ Cars created');

  // Create Sample Tasks
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const task1 = await prisma.task.create({
    data: {
      jobNumber: `JOB-${Date.now()}-001`,
      title: 'ติดตั้งเครื่องถ่ายเอกสาร',
      description: 'ติดตั้งเครื่องถ่ายเอกสารใหม่ที่บริษัท ABC',
      location: 'อาคาร ABC ชั้น 5',
      customerName: 'บริษัท ABC จำกัด',
      customerPhone: '02-123-4567',
      startDate: today,
      endDate: today,
      startTime: '09:00',
      endTime: '12:00',
      status: TaskStatus.WAITING,
      subUnitId: installUnit.id,
      createdById: sales.id,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      jobNumber: `JOB-${Date.now()}-002`,
      title: 'ซ่อมปริ้นเตอร์ HP',
      description: 'ปริ้นเตอร์ HP ไม่ดึงกระดาษ',
      location: 'บริษัท XYZ ชั้น 3',
      customerName: 'บริษัท XYZ จำกัด',
      customerPhone: '02-987-6543',
      startDate: tomorrow,
      endDate: tomorrow,
      startTime: '13:00',
      endTime: '16:00',
      status: TaskStatus.WAITING,
      subUnitId: printerUnit.id,
      createdById: sales.id,
    },
  });

  console.log('✅ Sample tasks created');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📝 Test Accounts:');
  console.log('  Admin: admin@example.com / password123');
  console.log('  Finance: finance@example.com / password123');
  console.log('  Sales: sales@example.com / password123');
  console.log('  Head Tech: headtech@example.com / password123');
  console.log('  Leader (Rental): leader-rental@example.com / password123');
  console.log('  Leader (Install): leader-install@example.com / password123');
  console.log('  Leader (Printer): leader-printer@example.com / password123');
  console.log('  Tech 1: tech1@example.com / password123');
  console.log('  Tech 2: tech2@example.com / password123');
  console.log('  Tech 3: tech3@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
