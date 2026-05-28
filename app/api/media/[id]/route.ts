import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mediaTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [media] = await db.select().from(mediaTable).where(eq(mediaTable.id, parseInt(id)));
    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    return NextResponse.json(media);
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const [updatedMedia] = await db
      .update(mediaTable)
      .set(body)
      .where(eq(mediaTable.id, parseInt(id)))
      .returning();
    
    if (!updatedMedia) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    
    return NextResponse.json(updatedMedia);
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [deletedMedia] = await db
      .delete(mediaTable)
      .where(eq(mediaTable.id, parseInt(id)))
      .returning();
    
    if (!deletedMedia) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }
}