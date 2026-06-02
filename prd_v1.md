# CPM Web Application – Product Requirements Document (V1)

## 1. Product Overview

### Product Name

CPM Planner

### Purpose

A web-based Critical Path Method (CPM) planning tool that allows users to:

- Create projects
- Manage tasks and dependencies
- Generate CPM schedules
- Visualize project timelines through Gantt charts
- Visualize dependency networks through DAG graphs

### Target Users

- Students
- Project Managers
- Engineering Teams
- Construction Planning Teams
- Research Teams

---

# 2. Core User Flow

```text
Landing Page
      ↓
Login / Signup
      ↓
Dashboard
      ↓
Open Project
      ↓
Project Workspace
      ├── Overview
      ├── Tasks
      ├── Gantt Chart
      └── Graph
```

---

# 3. Landing Page

## Goal

Explain the product and encourage users to sign up.

### Navbar

Simple navigation bar containing:

- Features
- How It Works
- Demo
- Documentation
- Login
- Get Started

### Hero Section

#### Content

- Product title
- Short value proposition
- CTA buttons:
  - Get Started
  - View Demo

### Key Features

Highlight:

- Task Management
- Dependency Mapping
- CPM Calculation
- Gantt Charts
- Critical Path Visualization

### How It Works

#### Step 1

Create a Project

#### Step 2

Add Tasks and Dependencies

#### Step 3

Generate CPM Schedule and Visualizations

### Interactive Demo

Small sample project showing:

- Tasks
- Dependencies
- Generated graph

### Why Use CPM Planner

Benefits:

- Better project planning
- Dependency tracking
- Critical path visibility
- Schedule optimization

### Metrics Section

Display:

- Projects Created
- Tasks Managed
- CPM Runs Generated

(May use placeholder values in V1)

### Use Cases

Examples:

- Academic Projects
- Software Development
- Construction Planning
- Event Management

### Screenshots / Product Tour

Show:

- Dashboard
- Task Board
- Gantt Chart
- Graph View

### Final CTA

#### Heading

Start Planning Smarter

#### Actions

- Get Started
- Login

---

# 4. Authentication

## Login Page

### Fields

- Email
- Password

### Actions

- Sign In
- Continue with Google

### Links

- Forgot Password
- Sign Up

### Features

- Show Password
- Hide Password

### Validation

- Invalid Email
- Incorrect Password

---

## Signup Page

### Fields

- Username
- Email
- Password

### Actions

- Create Account
- Continue with Google

### Links

- Already have an account? Login

### Password Requirements

- Minimum 8 characters
- Maximum 128 characters
- One uppercase letter
- One lowercase letter
- One number
- One special character

### Security

#### Password Hashing

Use:

- Argon2

Passwords must never be stored in plaintext.

---

# 5. Dashboard

## Goal

Provide quick visibility into user projects.

### Layout

#### Welcome Section

Display:

- User name
- Greeting message

#### Quick Stats

Display:

- Total Projects
- Total Tasks
- Completed Tasks

#### Recent Projects

List recently accessed projects.

#### Upcoming Milestones

Show nearest upcoming task deadlines.

#### Recent Activity

Examples:

- Task Created
- Task Updated
- Dependency Added

#### Quick Actions

Buttons:

- New Project
- Open Project

#### Search and Filters

Search projects by:

- Project Name

#### Empty State

If no projects exist:

```text
Create your first project to get started.
```

---

# 6. Sidebar

Present throughout authenticated application.

## Navigation Items

- Dashboard
- Projects
- Settings

---

# 7. Project Workspace

## Goal

Central project management area.

### Workspace Header

Display:

- Project Name
- Project Description
- Total Tasks
- Last Updated
- Last CPM Run

### Workspace Tabs

1. Overview
2. Tasks
3. Gantt Chart
4. Graph

---

# 8. Overview Tab

## Summary Section

Display:

- Total Tasks
- Completed Tasks
- In Progress Tasks
- Pending Tasks

## Recent Activity

Project-specific activity log.

---

# 9. Tasks Tab

## Goal

Manage project tasks and dependencies.

### Task Board

Three columns:

- To Do
- In Progress
- Done

### Task List

Display:

- Task Name
- Status
- Start Date
- End Date
- Duration

### Add Task

Button opens modal.

### Add Task Modal

#### Basic Information

- Task Name
- Description

#### Scheduling

- Start Date
- End Date
- Duration

#### Status

- To Do
- In Progress
- Done

#### Dependencies

- Blocking (tasks this task blocks)
- Blocked By (prerequisite tasks)

### Edit Task

Users can update:

- Details
- Dates
- Dependencies
- Status

---

# 10. Gantt Chart Tab

## Goal

Visual timeline representation.

### Features

#### Timeline View

Display project schedule.

#### Task Bars

Each task represented as a bar.

#### Dependency Lines

Connect dependent tasks.

#### Zoom Levels

- Day
- Week
- Month

#### Current Date Indicator

Vertical line showing today.

#### Horizontal Scrolling

Support large projects.

#### Status Colors

- To Do
- In Progress
- Done

---

# 11. Graph Tab

## Goal

Visualize project dependency network.

### Graph Type

Directed Acyclic Graph (DAG)

### Features

#### Left-to-Right Layout

Project flow displayed from left to right.

#### Dependency Arrows

Show task relationships.

#### Node Information

Display:

- Task Name
- Duration
- Start Date
- End Date

#### Zoom

Zoom in/out.

#### Pan

Move around graph.

#### Critical Path Highlighting

Highlight critical path nodes and edges.

---

# 12. CPM Engine Requirements

## Inputs

- Tasks
- Durations
- Dependencies

## Outputs

For every task:

- Early Start (ES)
- Early Finish (EF)
- Late Start (LS)
- Late Finish (LF)
- Float

## Project Outputs

- Critical Path
- Total Project Duration

---

# 13. Settings

## User Profile

- Username
- Email

## Security

- Change Password

---

# 14. Non-Functional Requirements

## Performance

- Dashboard load < 2 seconds
- Graph rendering < 3 seconds for 500 tasks

## Security

- Argon2 password hashing
- Secure authentication
- Input validation

## Responsiveness

Support:

- Desktop (Primary)
- Tablet (Basic)

Mobile support can be deferred after V1.

---

# 15. V1 Scope Summary

## Included

- Authentication
- Dashboard
- Project Management
- Task Management
- Dependencies
- CPM Calculations
- Gantt Chart
- DAG Graph Visualization
- Critical Path Highlighting
- Settings

## Excluded (Future Versions)

- Real-time collaboration
- Comments
- Notifications
- File attachments
- Team roles & permissions
- Resource management
- AI scheduling suggestions
- Advanced analytics
- Export to PDF/Excel

---

## MVP Goal

Deliver a complete CPM planning workflow:

```text
Create Project
      ↓
Add Tasks
      ↓
Define Dependencies
      ↓
Run CPM
      ↓
View Critical Path
      ↓
Analyze via Gantt & Graph
```

This scope is intentionally limited to ensure a fast and stable first release while delivering the core value of project scheduling and critical path analysis.
```