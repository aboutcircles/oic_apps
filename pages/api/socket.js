import { Server } from 'socket.io';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false
});

let lastRowCount = 0;

export default function handler(req, res) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // Start monitoring the database
    const checkForChanges = async () => {
      try {
        const result = await pool.query('SELECT COUNT(*) as count FROM "CrcV2_OIC_OpenMiddlewareTransfer"');
        const currentCount = parseInt(result.rows[0].count);

        if (lastRowCount === 0) {
          lastRowCount = currentCount;
          console.log(`Initial row count: ${currentCount}`);
        } else if (currentCount > lastRowCount) {
          const newRows = currentCount - lastRowCount;
          console.log(`New rows detected: ${newRows}`);

          io.emit('db-change', {
            table: 'CrcV2_OIC_OpenMiddlewareTransfer',
            newRows: newRows,
            totalRows: currentCount,
            timestamp: new Date().toISOString()
          });

          lastRowCount = currentCount;
        }
      } catch (error) {
        console.error('Database monitoring error:', error);
      }
    };

    // Check every 5 seconds
    setInterval(checkForChanges, 5000);

    // Initial check
    checkForChanges();
  }
  res.end();
}
