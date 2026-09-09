import { buildApp } from './app.js';
import { env } from './config/env.js';
import { closeDatabaseConnections, ensureDatabaseInitialized } from './database/client.js';
import { closeRedisConnection } from './redis/client.js';
import { seedInitialSystemData } from './database/seeds/initial.js';
import { emailQueueWorker } from './modules/notifications/email-queue.worker.js';
import { emailScheduler } from './modules/notifications/email-scheduler.js';
import { backupScheduler } from './modules/backup/backup-scheduler.js';

export async function startServer() {
  const app = buildApp();

  // Handle graceful shutdown signals
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      try {
        backupScheduler.stop();
        emailScheduler.stop();
        emailQueueWorker.stopPeriodicRunner();
        await app.close();
        await closeDatabaseConnections();
        await closeRedisConnection();
        console.log('Server and connections closed safely.');
        process.exit(0);
      } catch (err) {
        console.error('Error during graceful shutdown:', err);
        process.exit(1);
      }
    });
  }

  try {
    // Initialize and verify database tables/migrations
    await ensureDatabaseInitialized();

    // Seed initial roles, permissions, catalog, and admin users
    try {
      await seedInitialSystemData();
      console.log('✅ System roles, catalog, and user accounts seeded successfully.');
    } catch (seedErr) {
      console.warn('⚠️ Warning: Database seeding encountered an error:', seedErr);
    }

    // Start background transactional email worker and scheduler
    emailQueueWorker.startPeriodicRunner(30000); // Check email queue every 30s
    emailScheduler.start(15); // Check due reminders & expiries every 15m
    console.log('📧 PHPMailer transactional email worker and scheduler initialized.');

    // Initialize automated backup scheduler
    await backupScheduler.initialize();
    console.log('🛡️ Automated Backup Scheduler initialized.');

    const address = await app.listen({
      port: env.PORT,
      host: env.HOST,
    });
    console.log(`\n🚀 SR Enterprises CRM API running at: ${address}`);
    console.log(`📋 Health check: ${address}/health`);
    console.log(`📋 Readiness probe: ${address}/ready`);
    console.log(`🔗 API v1 root: ${address}/api/v1\n`);

    // 24/7 Keep-Alive heartbeat for Render Free Tier (pings every 10 minutes to prevent idle sleep)
    const keepAliveUrl = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL;
    if (keepAliveUrl) {
      const cleanUrl = keepAliveUrl.replace(/\/+$/, '');
      const pingInterval = 10 * 60 * 1000; // 10 minutes
      setInterval(async () => {
        try {
          const res = await fetch(`${cleanUrl}/health`);
          console.log(`[KeepAlive] 24/7 heartbeat ping to ${cleanUrl}/health -> Status ${res.status}`);
        } catch (pingErr: any) {
          console.warn(`[KeepAlive] 24/7 heartbeat ping notice: ${pingErr?.message || pingErr}`);
        }
      }, pingInterval);
      console.log(`⏱️ 24/7 Keep-Alive heartbeat active for Render: ${cleanUrl}/health`);
    }

    return app;
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Automatically start server
startServer();

