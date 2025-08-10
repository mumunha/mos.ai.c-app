import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { exportForEmbeddingAtlas, getMosaicData, saveProjections } from '@/lib/mosaic-data';
import { computeSimilarityLayout } from '@/lib/projection';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the raw mosaic data
    const items = await getMosaicData(user.id);
    
    // Compute projections if needed
    const itemsWithEmbeddings = items.filter(item => item.embedding && item.embedding.length > 0);
    
    if (itemsWithEmbeddings.length > 0) {
      // Compute 2D projections using similarity-based layout
      const vectors = itemsWithEmbeddings.map(item => ({
        id: item.id,
        embedding: item.embedding
      }));
      
      const projections = computeSimilarityLayout(vectors);
      
      // Save projections to database
      await saveProjections(user.id, projections.map(p => ({
        ...p,
        type: items.find(item => item.id === p.id)?.type || 'unknown'
      })));
    }

    // Export the data with projections included
    const data = await exportForEmbeddingAtlas(user.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching mosaic data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mosaic data' },
      { status: 500 }
    );
  }
}