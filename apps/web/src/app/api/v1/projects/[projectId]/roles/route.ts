import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Fetch all custom roles for this project
    const roles = await prisma.projectCustomRole.findMany({
      where: { projectId },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Fetch custom roles error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Access control: Only project managers, captains, or admins can manage roles
    if (!await hasPermission(session.userId as string, projectId, 'manage_roles')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      approveTasks,
      changeTaskStatus,
      addTasks,
      modifyTasks,
      addDepartments,
      manageTags,
      makeAnnouncements,
      manageTeam,
      manageRoles
    } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check if already exists in this project
    const existing = await prisma.projectCustomRole.findUnique({
      where: { projectId_name: { projectId, name: trimmedName } }
    });
    if (existing) {
      return NextResponse.json({ error: 'Role name already exists in this project' }, { status: 400 });
    }

    const newRole = await prisma.projectCustomRole.create({
      data: {
        projectId,
        name: trimmedName,
        description: description || null,
        approveTasks: !!approveTasks,
        changeTaskStatus: !!changeTaskStatus,
        addTasks: !!addTasks,
        modifyTasks: modifyTasks || 'ALL',
        addDepartments: !!addDepartments,
        manageTags: !!manageTags,
        makeAnnouncements: !!makeAnnouncements,
        manageTeam: !!manageTeam,
        manageRoles: !!manageRoles
      }
    });

    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error('Create custom role error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Access control
    if (!await hasPermission(session.userId as string, projectId, 'manage_roles')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get('id');
    if (!roleId) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      description,
      approveTasks,
      changeTaskStatus,
      addTasks,
      modifyTasks,
      addDepartments,
      manageTags,
      makeAnnouncements,
      manageTeam,
      manageRoles
    } = body;

    const role = await prisma.projectCustomRole.findFirst({
      where: { id: roleId, projectId }
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const updatedRole = await prisma.projectCustomRole.update({
      where: { id: roleId },
      data: {
        ...(name && { name: name.trim() }),
        description: description !== undefined ? description : role.description,
        approveTasks: approveTasks !== undefined ? !!approveTasks : role.approveTasks,
        changeTaskStatus: changeTaskStatus !== undefined ? !!changeTaskStatus : role.changeTaskStatus,
        addTasks: addTasks !== undefined ? !!addTasks : role.addTasks,
        modifyTasks: modifyTasks !== undefined ? modifyTasks : role.modifyTasks,
        addDepartments: addDepartments !== undefined ? !!addDepartments : role.addDepartments,
        manageTags: manageTags !== undefined ? !!manageTags : role.manageTags,
        makeAnnouncements: makeAnnouncements !== undefined ? !!makeAnnouncements : role.makeAnnouncements,
        manageTeam: manageTeam !== undefined ? !!manageTeam : role.manageTeam,
        manageRoles: manageRoles !== undefined ? !!manageRoles : role.manageRoles
      }
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error('Update custom role error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Access control
    if (!await hasPermission(session.userId as string, projectId, 'manage_roles')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get('id');
    if (!roleId) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    const role = await prisma.projectCustomRole.findFirst({
      where: { id: roleId, projectId }
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // On deletion of a custom role, members with this custom role will automatically fall back to standard Member role
    await prisma.projectMember.updateMany({
      where: { customRoleId: roleId },
      data: { customRoleId: null, role: 'Member' }
    });

    await prisma.projectCustomRole.delete({
      where: { id: roleId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete custom role error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
