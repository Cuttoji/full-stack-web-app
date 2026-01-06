# Task & Resource Management System

ระบบจัดการงานและทรัพยากร (Task & Resource Management) สำหรับองค์กรที่มีหลายแผนกและหลายบทบาท

[![Tests](https://img.shields.io/badge/tests-139%20passing-brightgreen)](https://github.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)

## 🌟 Features

### Role-Based Access Control
- **ADMIN** - ผู้ดูแลระบบ: จัดการผู้ใช้, ดูรายงานทั้งหมด
- **FINANCE** - การเงิน: ดูรายงาน, จัดการงบประมาณ
- **SALES** - ฝ่ายขาย: สร้างงาน, ดูรายงาน
- **HEAD_TECH** - หัวหน้าแผนกช่าง: จัดการรถ, มอบหมายงาน, ดูงานทั้งหมด
- **LEADER** - หัวหน้าทีม: มอบหมายงาน, อนุมัติใบลา
- **TECH** - ช่าง: รับงาน, อัปเดตสถานะ, บันทึกหลักฐาน

### Task Management
- สร้าง/แก้ไข/ลบงาน
- สถานะงาน: รอรับงาน → กำลังทำ → จบงาน / ยกเลิก
- มอบหมายช่างหลายคนต่องาน
- จัดการรถประจำงาน
- อัปโหลดรูปหลักฐานก่อน/หลังทำงาน
- ฟอร์มบันทึกซ่อมปริ้นเตอร์ (สำหรับกลุ่มปริ้นเตอร์)
- งานวนซ้ำ (รายวัน/รายสัปดาห์/รายเดือน)

### Leave Management
- ขอลา (ลาป่วย, ลากิจ, ลาพักร้อน)
- หัวหน้าทีมอนุมัติ/ปฏิเสธใบลา
- ติดตามโควตาวันลา

### Calendar View
- ดูงานในรูปแบบปฏิทิน
- กรองตามกลุ่มงาน

### Fleet Management
- จัดการรถ (เพิ่ม/แก้ไข/ลบ)
- ติดตามสถานะรถ (ว่าง/ใช้งาน/ซ่อมบำรุง)
- ตรวจสอบความขัดแย้งการใช้รถ

### Offline Support
- ทำงานได้แม้ไม่มีอินเทอร์เน็ต
- ซิงค์ข้อมูลอัตโนมัติเมื่อออนไลน์

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: React Context + TanStack Query
- **Authentication**: JWT (jsonwebtoken + bcryptjs)
- **Validation**: Zod
- **Date Handling**: date-fns
- **Testing**: Vitest + Playwright
- **Icons**: Lucide React

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or use Docker)
- Docker (optional, for database)

### Quick Start with Docker

1. **Clone the repository**
```bash
git clone <repository-url>
cd full-stack-web-app
```

2. **Setup environment**
```bash
cp .env.example .env
# Edit .env with your secrets
```

3. **Start database with Docker**
```bash
docker-compose up -d
```

4. **Install dependencies & setup**
```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed  # Optional: seed initial data
```

5. **Start development server**
```bash
npm run dev
```

### Manual Database Setup

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API Routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── cars/          # Car management
│   │   ├── leaves/        # Leave management
│   │   ├── tasks/         # Task management
│   │   └── users/         # User management
│   ├── calendar/          # Calendar page
│   ├── cars/              # Cars page
│   ├── dashboard/         # Dashboard page
│   ├── leaves/            # Leaves page
│   ├── login/             # Login page
│   ├── notifications/     # Notifications page
│   ├── settings/          # Settings page
│   ├── tasks/             # Tasks pages
│   └── users/             # Users page
├── components/            # React components
│   ├── layout/            # Layout components
│   ├── tasks/             # Task-related components
│   └── ui/                # UI components
├── contexts/              # React Context providers
├── lib/                   # Utility functions & types
├── prisma/                # Prisma schema & migrations
└── public/                # Static files
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Tasks
- `GET /api/tasks` - List tasks (with pagination & filters)
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/assign` - Assign technicians

### Leaves
- `GET /api/leaves` - List leaves
- `POST /api/leaves` - Create leave request
- `PATCH /api/leaves/:id` - Update leave (approve/reject)

### Cars
- `GET /api/cars` - List cars
- `POST /api/cars` - Create car
- `PATCH /api/cars/:id` - Update car
- `DELETE /api/cars/:id` - Delete car

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🌐 Departments & Sub-Units

### Departments
1. **ฝ่ายขาย (Sales)**
2. **การเงิน (Finance)**
3. **แผนกช่าง (Tech)** - มี 3 กลุ่มย่อย:
   - เครื่องเช่า (Rental)
   - ติดตั้ง (Installation)
   - ปริ้นเตอร์ (Printer)

## 📝 License

MIT License

## 👥 Contributors

- Your Name

## 📚 Documentation

- [API Documentation](docs/API.md)
- [Architecture Guide](docs/ARCHITECTURE.md)

## 🧪 Testing

The project includes comprehensive test coverage with both unit and integration tests.

**Current Test Status**: ✅ All 139 tests passing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests (requires dev server)
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Test Coverage
- **Unit Tests**: 129 tests covering utility functions, API responses, authentication, and middleware
- **Integration Tests**: 10 tests covering API endpoints and authentication flows
- **E2E Tests**: Playwright tests for critical user flows

**Recent Optimizations (January 2026)**:
- ✅ Fixed TypeScript type errors in test files
- ✅ Removed unused imports and dependencies
- ✅ Optimized Notifications API Zod validation
- ✅ All 7 test suites passing successfully

## 🚀 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:e2e:ui` | Run E2E tests with UI |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | Run ESLint |
| `npm run storybook` | Start Storybook |

## 📊 Project Status

- ✅ **Build**: Production build successful
- ✅ **Tests**: 139/139 passing (100%)
- ✅ **TypeScript**: No type errors
- ✅ **Linting**: Clean code, no ESLint errors
- 🚀 **Ready for deployment**

---