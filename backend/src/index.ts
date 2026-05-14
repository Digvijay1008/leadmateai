import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, errorHandler, notFoundHandler, globalRateLimit } from './core/index.js';
import { realEstateRoutes } from './domain/realestate/index.js';
import { checkDatabaseConnection, closeDatabasePool, startBackgroundJobs, stopBackgroundJobs, startWebhookTaskWorker, stopWebhookTaskWorker } from './platform/index.js';


// ===========================================
// EXPRESS APPLICATION
// ===========================================

const app = express();

// ===========================================
// MIDDLEWARE
// ===========================================

// Rate limiting (global)
app.use(globalRateLimit);

// Security headers
app.use(helmet());

// CORS
app.use(cors({
    origin: config.server.isDev
        ? '*'
        : [
            'https://leadmate.ai',
            'https://app.leadmate.ai',
            'https://widget.leadmate.ai',
        ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id', 'X-Tenant-Id'],
    credentials: true,
}));

// Raw body capture for webhook signature verification
// Must be BEFORE the global express.json() to capture unparsed body
// LiveKit sends application/json, so we use express.json with verify callback
app.use('/api/v1/webhooks', express.json({
    verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf-8');
    }
}));

// Body parsing (all other routes)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (development only)
if (config.server.isDev) {
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
        });
        next();
    });
}

// ===========================================
// ROUTES
// ===========================================

app.use('/api', realEstateRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Leadmate Voice AI Backend',
        version: '1.0.0',
        status: 'running',
        docs: '/api/v1',
    });
});

// ===========================================
// ERROR HANDLING
// ===========================================

app.use(notFoundHandler);
app.use(errorHandler);

// ===========================================
// SERVER STARTUP
// ===========================================

async function startServer() {
    console.log('🚀 Starting Leadmate Backend...');
    console.log(`   Environment: ${config.server.nodeEnv}`);

    // Check database connection
    console.log('📦 Checking database connection...');
    const dbConnected = await checkDatabaseConnection();

    if (!dbConnected) {
        console.error('❌ Database connection failed. Exiting.');
        process.exit(1);
    }

    console.log('✅ Database connected');

    // Start background jobs
    console.log('🕰️  Starting background jobs...');
    const jobInterval = startBackgroundJobs();
    startWebhookTaskWorker();

    // Start server
    const server = app.listen(config.server.port, () => {
        console.log(`✅ Server running on http://localhost:${config.server.port}`);
        console.log(`   API Docs: http://localhost:${config.server.port}/api/v1`);
        console.log(`   Health:   http://localhost:${config.server.port}/api/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);

        // Stop background jobs
        stopBackgroundJobs(jobInterval);
        await stopWebhookTaskWorker();

        server.close(async () => {
            console.log('   HTTP server closed');

            await closeDatabasePool();
            console.log('   Database pool closed');

            console.log('👋 Goodbye!');
            process.exit(0);
        });

        // Force exit after 10 seconds
        setTimeout(() => {
            console.error('⚠️  Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

// Run
startServer().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});

export { app };
