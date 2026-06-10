-- AlterTable
ALTER TABLE "project_members" ADD COLUMN     "customRoleId" TEXT;

-- CreateTable
CREATE TABLE "project_custom_roles" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "approveTasks" BOOLEAN NOT NULL DEFAULT false,
    "changeTaskStatus" BOOLEAN NOT NULL DEFAULT false,
    "addTasks" BOOLEAN NOT NULL DEFAULT false,
    "modifyTasks" TEXT NOT NULL DEFAULT 'ALL',
    "addDepartments" BOOLEAN NOT NULL DEFAULT false,
    "manageTags" BOOLEAN NOT NULL DEFAULT false,
    "makeAnnouncements" BOOLEAN NOT NULL DEFAULT false,
    "manageTeam" BOOLEAN NOT NULL DEFAULT false,
    "manageRoles" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_custom_roles_projectId_idx" ON "project_custom_roles"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_custom_roles_projectId_name_key" ON "project_custom_roles"("projectId", "name");

-- CreateIndex
CREATE INDEX "project_members_customRoleId_idx" ON "project_members"("customRoleId");

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "project_custom_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_custom_roles" ADD CONSTRAINT "project_custom_roles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
