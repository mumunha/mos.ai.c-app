import { Pool } from 'pg';

// Database connection pool
let pool;

function getPool() {
  if (!pool) {
    // Parse DATABASE_URL to handle SSL parameter
    const databaseUrl = process.env.DATABASE_URL;
    let connectionConfig;
    
    if (databaseUrl && databaseUrl.includes('?sslmode=')) {
      // Use the connection string as-is if it already specifies SSL mode
      connectionConfig = {
        connectionString: databaseUrl,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
    } else {
      // Default configuration with flexible SSL handling
      connectionConfig = {
        connectionString: databaseUrl,
        ssl: false, // Start with no SSL for Railway
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
    }

    pool = new Pool(connectionConfig);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
}

// Helper function to execute queries
async function query(text, params) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Helper function for transactions
async function transaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Close the pool (for graceful shutdown)
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export {
  getPool,
  query,
  transaction,
  closePool
};