import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getProjections, saveProjections } from '@/lib/mosaic-data';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projections = await getProjections(user.id);

    return NextResponse.json({ projections });
  } catch (error) {
    console.error('Error fetching projections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projections } = body;

    if (!Array.isArray(projections)) {
      return NextResponse.json({ error: 'Invalid projections data' }, { status: 400 });
    }

    await saveProjections(user.id, projections);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving projections:', error);
    return NextResponse.json(
      { error: 'Failed to save projections' },
      { status: 500 }
    );
  }
}