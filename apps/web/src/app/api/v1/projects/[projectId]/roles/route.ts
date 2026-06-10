import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all roles
    let roles = await prisma.role.findMany({
      orderBy: { name: 'asc' }
    });

    // If empty, ensure default "Project Admin" exists
    if (roles.length === 0) {
      const defaultRole = await prisma.role.create({
        data: {
          name: 'Project Admin',
          description: 'Default administrative role with full access to project configuration'
        }
      });
      roles = [defaultRole];
    }

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Fetch roles error:', error);
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

    // Access control: Only project admins or admins can manage roles
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership || (membership.role.toUpperCase() !== 'PROJECT ADMIN' && membership.role.toUpperCase() !== 'PROJECT_ADMIN' && membership.role.toUpperCase() !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description } = body;
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    
    // Do not allow creating OWNER role
    if (trimmedName.toUpperCase() === 'OWNER') {
      return NextResponse.json({ error: 'The OWNER role is deleted and cannot be created' }, { status: 400 });
    }

    // Check if already exists
    const existing = await prisma.role.findUnique({
      where: { name: trimmedName }
    });
    if (existing) {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 });
    }

    const newRole = await prisma.role.create({
      data: {
        name: trimmedName,
        description
      }
    });

    return NextResponse.json(newRole, { status: 201 });
  } catch (error) {
    console.error('Create role error:', error);
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
    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership || (membership.role.toUpperCase() !== 'PROJECT ADMIN' && membership.role.toUpperCase() !== 'PROJECT_ADMIN' && membership.role.toUpperCase() !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get('id');
    if (!roleId) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (role.name === 'Project Admin') {
      return NextResponse.json({ error: 'The default Project Admin role cannot be deleted' }, { status: 400 });
    }

    await prisma.role.delete({
      where: { id: roleId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
