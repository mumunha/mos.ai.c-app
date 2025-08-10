// Simple dimensionality reduction for 2D visualization
// This is a simplified approach that works well for visualization purposes

export interface Vector {
  id: string;
  embedding: number[];
}

export interface Projection2D {
  id: string;
  x: number;
  y: number;
}

// PCA-based dimensionality reduction to 2D
export function computePCA2D(vectors: Vector[]): Projection2D[] {
  if (vectors.length === 0) return [];
  
  const n = vectors.length;
  const d = vectors[0].embedding.length;
  
  // Step 1: Compute mean
  const mean = new Array(d).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < d; i++) {
      mean[i] += vec.embedding[i];
    }
  }
  for (let i = 0; i < d; i++) {
    mean[i] /= n;
  }
  
  // Step 2: Center the data
  const centered: number[][] = vectors.map(vec => 
    vec.embedding.map((val, i) => val - mean[i])
  );
  
  // Step 3: Compute covariance matrix (simplified - just use first 2 principal components)
  // For efficiency, we'll use a random projection approach
  const randomMatrix = generateRandomMatrix(d, 2);
  
  // Step 4: Project data
  const projections: Projection2D[] = vectors.map((vec, idx) => {
    const x = dotProduct(centered[idx], randomMatrix[0]);
    const y = dotProduct(centered[idx], randomMatrix[1]);
    
    return {
      id: vec.id,
      x,
      y
    };
  });
  
  // Step 5: Normalize to [-10, 10] range
  return normalizeProjections(projections);
}

// t-SNE inspired similarity-based layout
export function computeSimilarityLayout(vectors: Vector[]): Projection2D[] {
  if (vectors.length === 0) return [];
  
  const n = vectors.length;
  
  // Initialize random positions
  const positions: Projection2D[] = vectors.map(vec => ({
    id: vec.id,
    x: (Math.random() - 0.5) * 20,
    y: (Math.random() - 0.5) * 20
  }));
  
  // Compute pairwise similarities
  const similarities: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = cosineSimilarity(vectors[i].embedding, vectors[j].embedding);
      similarities[i][j] = sim;
      similarities[j][i] = sim;
    }
  }
  
  // Simple force-directed layout based on similarities
  const iterations = 50;
  const learningRate = 0.1;
  
  for (let iter = 0; iter < iterations; iter++) {
    const forces: { x: number; y: number }[] = Array(n).fill(null).map(() => ({ x: 0, y: 0 }));
    
    // Calculate forces
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        
        // Attractive force for similar items
        const targetDist = 2 + (1 - similarities[i][j]) * 8;
        const force = (dist - targetDist) * 0.1;
        
        forces[i].x += (dx / dist) * force;
        forces[i].y += (dy / dist) * force;
      }
    }
    
    // Apply forces
    for (let i = 0; i < n; i++) {
      positions[i].x -= forces[i].x * learningRate;
      positions[i].y -= forces[i].y * learningRate;
    }
  }
  
  return normalizeProjections(positions);
}

// Helper functions
function generateRandomMatrix(rows: number, cols: number): number[][] {
  const matrix: number[][] = [];
  for (let i = 0; i < cols; i++) {
    const row: number[] = [];
    for (let j = 0; j < rows; j++) {
      row.push((Math.random() - 0.5) * 2);
    }
    // Normalize
    const norm = Math.sqrt(row.reduce((sum, val) => sum + val * val, 0));
    matrix.push(row.map(val => val / norm));
  }
  return matrix;
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProd = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProd += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProd / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

function normalizeProjections(projections: Projection2D[]): Projection2D[] {
  if (projections.length === 0) return [];
  
  // Find bounds
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const p of projections) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  
  // Normalize to [-10, 10] range
  return projections.map(p => ({
    id: p.id,
    x: ((p.x - minX) / rangeX - 0.5) * 20,
    y: ((p.y - minY) / rangeY - 0.5) * 20
  }));
}