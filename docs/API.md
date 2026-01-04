# API Documentation

## Overview

This document describes the REST API endpoints for the Task Management System.

### Base URL
```
http://localhost:3000/api
```

### Authentication

All API endpoints (except `/api/auth/login`) require authentication using JWT tokens.

Include the token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

### Response Format

All responses follow this standard format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message in Thai",
  "code": "ERROR_CODE"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| BAD_REQUEST | 400 | Invalid request data |
| VALIDATION_ERROR | 400 | Input validation failed |
| DUPLICATE_ENTRY | 409 | Resource already exists |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Endpoints

### Authentication

#### POST /api/auth/login

Authenticate a user and receive a JWT token.

**Rate Limit:** 5 requests per 60 seconds per IP

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id",
      "employeeId": "EMP001",
      "email": "user@example.com",
      "name": "User Name",
      "role": "TECH",
      "departmentId": "dept-id"
    }
  }
}
```

**Errors:**
- 400: Missing email or password
- 401: Invalid credentials
- 429: Too many login attempts

#### GET /api/auth/me

Get the current authenticated user's information.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "employeeId": "EMP001",
    "email": "user@example.com",
    "name": "User Name",
    "role": "TECH",
    "departmentId": "dept-id",
    "department": {
      "id": "dept-id",
      "name": "Technical"
    }
  }
}
```

---

### Dashboard

#### GET /api/dashboard

Get dashboard statistics and recent activity.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalTasks": 25,
      "pendingTasks": 10,
      "completedTasks": 15,
      "pendingLeaves": 3
    },
    "recentTasks": [...],
    "recentLeaves": [...],
    "notifications": [...]
  }
}
```

---

### Users

#### GET /api/users

Get a list of all users. Requires `canViewAllUsers` permission.

**Query Parameters:**
- `departmentId` (optional): Filter by department
- `role` (optional): Filter by role

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "employeeId": "EMP001",
      "email": "user@example.com",
      "name": "User Name",
      "role": "TECH",
      "department": {
        "id": "dept-id",
        "name": "Technical"
      },
      "leaveQuotas": [...]
    }
  ]
}
```

#### POST /api/users

Create a new user. Requires `canManageUsers` permission.

**Request Body:**
```json
{
  "employeeId": "EMP002",
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "role": "TECH",
  "departmentId": "dept-id"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "new-user-id",
    "employeeId": "EMP002",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "TECH"
  }
}
```

#### GET /api/users/:id

Get a specific user by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "employeeId": "EMP001",
    "email": "user@example.com",
    "name": "User Name",
    "role": "TECH",
    "department": {...},
    "leaveQuotas": [...]
  }
}
```

#### PUT /api/users/:id

Update a user. Requires `canManageUsers` permission.

**Request Body:**
```json
{
  "name": "Updated Name",
  "role": "LEADER",
  "departmentId": "new-dept-id"
}
```

---

### Tasks

#### GET /api/tasks

Get a list of tasks. Users see tasks based on their role and permissions.

**Query Parameters:**
- `status` (optional): Filter by status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
- `priority` (optional): Filter by priority (LOW, MEDIUM, HIGH, URGENT)
- `assignedTo` (optional): Filter by assigned user ID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "task-id",
      "jobNumber": "JOB-20250104-001",
      "title": "Task Title",
      "description": "Task description",
      "status": "PENDING",
      "priority": "MEDIUM",
      "dueDate": "2025-01-10T00:00:00Z",
      "assignedTo": [
        {
          "user": {
            "id": "user-id",
            "name": "User Name"
          }
        }
      ],
      "createdBy": {
        "id": "creator-id",
        "name": "Creator Name"
      },
      "createdAt": "2025-01-04T00:00:00Z"
    }
  ]
}
```

#### POST /api/tasks

Create a new task. Requires `canCreateTasks` permission.

**Request Body:**
```json
{
  "title": "New Task",
  "description": "Task description",
  "priority": "HIGH",
  "dueDate": "2025-01-15",
  "assignedToIds": ["user-id-1", "user-id-2"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "new-task-id",
    "jobNumber": "JOB-20250104-002",
    "title": "New Task",
    "status": "PENDING"
  }
}
```

#### GET /api/tasks/:id

Get a specific task by ID.

#### PUT /api/tasks/:id

Update a task. Requires `canEditTaskDetails` permission.

**Request Body:**
```json
{
  "title": "Updated Title",
  "status": "IN_PROGRESS",
  "priority": "URGENT"
}
```

#### POST /api/tasks/:id/assign

Assign users to a task. Requires `canAssignTasks` permission.

**Request Body:**
```json
{
  "userIds": ["user-id-1", "user-id-2"]
}
```

#### POST /api/tasks/:id/approve

Approve a completed task. Requires `canApproveLeave` permission.

**Request Body:**
```json
{
  "checklist": {
    "workCompleted": true,
    "qualityChecked": true,
    "documentationComplete": true,
    "customerNotified": true
  },
  "notes": "Approval notes"
}
```

---

### Leaves

#### GET /api/leaves

Get leave requests. Users see leaves based on their permissions.

**Query Parameters:**
- `status` (optional): Filter by status (PENDING, APPROVED, REJECTED)
- `type` (optional): Filter by type (ANNUAL, SICK, PERSONAL, etc.)
- `userId` (optional): Filter by user (for managers)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "leave-id",
      "type": "ANNUAL",
      "startDate": "2025-01-10",
      "endDate": "2025-01-12",
      "status": "PENDING",
      "reason": "Vacation",
      "user": {
        "id": "user-id",
        "name": "User Name"
      },
      "createdAt": "2025-01-04T00:00:00Z"
    }
  ]
}
```

#### POST /api/leaves

Create a new leave request.

**Request Body:**
```json
{
  "type": "ANNUAL",
  "startDate": "2025-01-10",
  "endDate": "2025-01-12",
  "reason": "Family vacation"
}
```

#### GET /api/leaves/:id

Get a specific leave request.

#### PUT /api/leaves/:id

Update or approve/reject a leave request.

**Request Body (for approval):**
```json
{
  "status": "APPROVED",
  "approvalNote": "Approved"
}
```

#### POST /api/leaves/validate

Validate a leave request before submission.

**Request Body:**
```json
{
  "type": "ANNUAL",
  "startDate": "2025-01-10",
  "endDate": "2025-01-12"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "daysRequested": 3,
    "remainingQuota": 10
  }
}
```

---

### Departments

#### GET /api/departments

Get all departments.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "dept-id",
      "name": "Technical",
      "code": "TECH",
      "subUnits": [
        {
          "id": "subunit-id",
          "name": "Development"
        }
      ]
    }
  ]
}
```

---

### Sub-Units

#### GET /api/sub-units

Get all sub-units.

**Query Parameters:**
- `departmentId` (optional): Filter by department

---

### Notifications

#### GET /api/notifications

Get notifications for the current user.

**Query Parameters:**
- `unreadOnly` (optional): If true, return only unread notifications

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-id",
        "type": "TASK_ASSIGNED",
        "title": "New task assigned",
        "message": "You have been assigned a new task",
        "isRead": false,
        "createdAt": "2025-01-04T00:00:00Z"
      }
    ],
    "unreadCount": 5
  }
}
```

#### PUT /api/notifications

Mark notifications as read.

**Request Body:**
```json
{
  "notificationIds": ["notif-id-1", "notif-id-2"],
  "markAllAsRead": false
}
```

---

### Cars (Fleet Management)

#### GET /api/cars

Get all vehicles. Requires `canViewAllCalendars` or `canBookVehicles` permission.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "car-id",
      "licensePlate": "กข 1234",
      "brand": "Toyota",
      "model": "Camry",
      "status": "AVAILABLE",
      "currentBooking": null
    }
  ]
}
```

---

### Conflicts Check

#### POST /api/conflicts/check

Check for scheduling conflicts.

**Request Body:**
```json
{
  "userId": "user-id",
  "startDate": "2025-01-10",
  "endDate": "2025-01-12",
  "type": "leave"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "hasConflicts": false,
    "conflicts": []
  }
}
```

---

## Roles and Permissions

### Available Roles

| Role | Description |
|------|-------------|
| ADMIN | Full system access |
| CUSTOMER_SERVICE | Customer service team |
| FINANCE_LEADER | Finance department leader |
| FINANCE | Finance team member |
| SALES_LEADER | Sales department leader |
| SALES | Sales team member |
| HEAD_TECH | Head of technical team |
| LEADER | Team leader |
| TECH | Technician |

### Permissions

- `canViewTasks` - View tasks
- `canCreateTasks` - Create new tasks
- `canEditTaskDetails` - Edit task details
- `canDeleteTasks` - Delete tasks
- `canAssignTasks` - Assign tasks to users
- `canManageTasks` - Full task management
- `canApproveLeave` - Approve leave requests
- `canViewLeaveRequests` - View all leave requests
- `canManageUsers` - Manage user accounts
- `canViewAllUsers` - View all users
- `canManageFleet` - Manage vehicles
- `canBookVehicles` - Book vehicles
- `canViewReports` - View reports
- `canExportData` - Export data

---

## Rate Limiting

The following endpoints have rate limiting:

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/auth/login | 5 requests | 60 seconds |

Exceeding the rate limit returns a `429 Too Many Requests` response.

---

## Webhooks (Future)

*Documentation for webhooks will be added when implemented.*
