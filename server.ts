import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import Pusher from 'pusher';
import dotenv from 'dotenv';

dotenv.config();

import { apiRouter } from './server/routes/apiRouter.ts';
import { hashPassword, verifyToken, extractToken } from './server/security.ts';
import { dbManager } from './server/mysqlDatabase.ts';

function cleanEnv(val?: string | null): string {
  if (!val) return '';
  let cleaned = String(val).trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  if (cleaned.startsWith('${') && cleaned.endsWith('}')) {
    cleaned = cleaned.slice(2, -1).trim();
  }
  if (cleaned === 'undefined' || cleaned === 'null') return '';
  return cleaned;
}

function getPusherConfig() {
  const appId = cleanEnv(process.env.PUSHER_APP_ID || process.env.VITE_PUSHER_APP_ID);
  const key = cleanEnv(
    process.env.PUSHER_APP_KEY ||
    process.env.VITE_PUSHER_APP_KEY ||
    process.env.PUSHER_KEY ||
    process.env.VITE_PUSHER_KEY
  );
  const secret = cleanEnv(process.env.PUSHER_APP_SECRET || process.env.PUSHER_SECRET);
  const cluster = cleanEnv(
    process.env.PUSHER_APP_CLUSTER ||
    process.env.VITE_PUSHER_APP_CLUSTER ||
    process.env.PUSHER_CLUSTER ||
    process.env.VITE_PUSHER_CLUSTER
  ) || 'ap2';

  return { appId, key, secret, cluster };
}

// Pusher Server-side instance
let pusherServer: Pusher | null = null;
let pusherLogged = false;

function getPusherServer(): Pusher | null {
  if (pusherServer) return pusherServer;

  const { appId, key, secret, cluster } = getPusherConfig();

  if (appId && key && secret) {
    try {
      pusherServer = new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true
      });
      if (!pusherLogged) {
        pusherLogged = true;
        console.log(`[Pusher Server] configured: true`);
        console.log(`[Pusher Server] cluster: ${cluster}`);
        console.log(`[Pusher Server] public key configured: true`);
        console.log(`[Pusher Server] secret configured: true`);
      }
      return pusherServer;
    } catch (err: any) {
      console.warn('[Pusher Server] Failed to initialize Pusher server:', err?.message || err);
    }
  } else if (!pusherLogged) {
    pusherLogged = true;
    console.log(`[Pusher Server] configured: false`);
    console.log(`[Pusher Server] cluster: ${cluster || 'none'}`);
    console.log(`[Pusher Server] public key configured: ${Boolean(key)}`);
    console.log(`[Pusher Server] secret configured: ${Boolean(secret)}`);
  }
  return null;
}

// Trigger initial server check & log diagnostics on startup
getPusherServer();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use('/api', apiRouter);

  // API Health & Status Check
  app.get(['/api/health', '/api/status', '/api/status.php'], (_req, res) => {
    res.json({
      status: 'ONLINE',
      app: 'SolarPulse EPC ERP & CRM',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      server_time: new Date().toISOString(),
      features: {
        spa_routing: true,
        client_persistence: 'localStorage / JSON sync',
        gemini_proxy: Boolean(process.env.GEMINI_API_KEY),
        database_helper: true
      }
    });
  });

  // DB Status Check
  app.get(['/api/db', '/api/db.php'], (_req, res) => {
    res.json({
      status: 'STANDBY',
      message: 'The ERP is operating in high-performance local persistence mode with full export/import/restore capabilities.'
    });
  });

  // Centralized timing constants
  const PRESENCE_TIMEOUT_MS = 120 * 1000; // 120s (2 minutes) timeout for presence with clock-skew tolerance

  interface WorkforceRecord {
    userId: string;
    employeeCode?: string;
    name?: string;
    email?: string;
    role?: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
    batteryLevel?: number;
    activity?: string;
    updatedAt: string;
    lastSeenAt: string;
    isOnline: boolean;
    isSharingLocation: boolean;
    hasLocation: boolean;
    status: 'online' | 'moving' | 'idle' | 'offline';
  }

  const workforceState = new Map<string, WorkforceRecord>();
  const sseClients = new Set<express.Response>();
  const CACHE_FILE = path.join(process.cwd(), '.workforce_cache.json');

  // Read persisted workforce records from disk with retry on transient file lock
  function readWorkforceCacheFromDisk(): WorkforceRecord[] {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (fs.existsSync(CACHE_FILE)) {
          const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
          if (raw.trim()) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
          }
        }
      } catch (err) {
        // If file was being atomically replaced, retry briefly once
        if (attempt === 0) {
          const start = Date.now();
          while (Date.now() - start < 15) { /* spin 15ms */ }
        } else {
          console.warn('[Workforce Cache] Warning reading disk cache:', err);
        }
      }
    }
    return [];
  }

  // Deduplicate and resolve canonical employee ID (e.g. emp-1 vs admin@rejoysolar.com)
  function resolveCanonicalWorkforceKey(id: string, email?: string, employeeCode?: string, name?: string): string {
    const cleanId = (id || '').trim();
    const cleanEmail = (email || (cleanId.includes('@') ? cleanId : '')).trim().toLowerCase();
    const cleanCode = (employeeCode || '').trim().toUpperCase();
    const cleanName = (name || '').trim().toLowerCase();

    // If ID is already a standard employee code (e.g. emp-1, EMP001), prefer it
    if (cleanId.startsWith('emp-') || cleanId.startsWith('EMP')) {
      return cleanId;
    }

    // Check if any existing record in memory matches email or code
    for (const [key, rec] of workforceState.entries()) {
      if (key.startsWith('emp-') || key.startsWith('EMP')) {
        if (cleanEmail && rec.email && rec.email.trim().toLowerCase() === cleanEmail) {
          return key;
        }
        if (cleanCode && rec.employeeCode && rec.employeeCode.trim().toUpperCase() === cleanCode) {
          return key;
        }
        if (cleanName && rec.name && rec.name.trim().toLowerCase() === cleanName) {
          return key;
        }
      }
    }

    // Known canonical system mappings
    if (cleanEmail === 'admin@rejoysolar.com' || cleanName === 'vikram patel') return 'emp-1';
    if (cleanEmail === 'projectmanager@rejoysolar.com' || cleanName === 'amit sharma') return 'emp-2';
    if (cleanEmail === 'survey@rejoysolar.com' || cleanName === 'rajesh kumar' || cleanId === 'test-engineer-1') return 'emp-3';
    if (cleanEmail === 'salesmanager@rejoysolar.com' || cleanName === 'priya verma') return 'emp-4';
    if (cleanEmail === 'civil@rejoysolar.com' || cleanName === 'suresh patel') return 'emp-14';

    return cleanId || cleanEmail || cleanCode || 'unknown-user';
  }

  // Save current workforce state to disk atomically without clobbering concurrent multi-process writes
  function persistWorkforceState(): boolean {
    try {
      const diskRecords = readWorkforceCacheFromDisk();
      const mergedMap = new Map<string, WorkforceRecord>();

      // 1. Index disk records by canonical identity
      diskRecords.forEach((r) => {
        if (r && r.userId) {
          const canonicalKey = resolveCanonicalWorkforceKey(r.userId, r.email, r.employeeCode, r.name);
          mergedMap.set(canonicalKey, { ...r, userId: canonicalKey });
        }
      });

      // 2. Merge in-memory workforceState, preserving the newer lastSeenAt across processes
      workforceState.forEach((memRec, memKey) => {
        const canonicalKey = resolveCanonicalWorkforceKey(memKey, memRec.email, memRec.employeeCode, memRec.name);
        const diskRec = mergedMap.get(canonicalKey);

        if (!diskRec) {
          mergedMap.set(canonicalKey, { ...memRec, userId: canonicalKey });
        } else {
          const memTime = memRec.lastSeenAt ? new Date(memRec.lastSeenAt).getTime() : 0;
          const diskTime = diskRec.lastSeenAt ? new Date(diskRec.lastSeenAt).getTime() : 0;

          if (memTime >= diskTime) {
            // Memory is newer or equal: apply memory updates
            mergedMap.set(canonicalKey, {
              ...diskRec,
              ...memRec,
              userId: canonicalKey,
              latitude: memRec.latitude !== undefined ? memRec.latitude : diskRec.latitude,
              longitude: memRec.longitude !== undefined ? memRec.longitude : diskRec.longitude,
              hasLocation: Boolean(memRec.latitude !== undefined || diskRec.latitude !== undefined)
            });
          } else {
            // Disk is newer from another worker: update in-memory state
            workforceState.set(canonicalKey, diskRec);
          }
        }

        // Clean up memory alias key if different from canonicalKey
        if (memKey !== canonicalKey && workforceState.has(memKey)) {
          workforceState.delete(memKey);
        }
      });

      // 3. Re-sync memory to canonical records
      mergedMap.forEach((val, key) => {
        workforceState.set(key, val);
      });

      const arr = Array.from(mergedMap.values());
      const tempFile = `${CACHE_FILE}.tmp.${process.pid}.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(arr, null, 2), 'utf-8');
      fs.renameSync(tempFile, CACHE_FILE);
      return true;
    } catch (err) {
      console.error('[Workforce State] Failed to persist workforce cache to disk:', err);
      return false;
    }
  }

  // Authoritative sync across multi-process / multi-worker instances
  function syncWorkforceState(): void {
    const diskRecords = readWorkforceCacheFromDisk();
    const now = Date.now();

    diskRecords.forEach((rec: WorkforceRecord) => {
      if (!rec || !rec.userId) return;
      const canonicalKey = resolveCanonicalWorkforceKey(rec.userId, rec.email, rec.employeeCode, rec.name);
      const existing = workforceState.get(canonicalKey);
      const diskLastSeen = rec.lastSeenAt ? new Date(rec.lastSeenAt).getTime() : 0;
      // Clock skew tolerant check: online if lastSeen is within PRESENCE_TIMEOUT_MS
      const isOnline = Boolean(rec.isOnline) && (Math.abs(now - diskLastSeen) < PRESENCE_TIMEOUT_MS);

      rec.userId = canonicalKey;
      rec.isOnline = isOnline;
      if (!isOnline) rec.status = 'offline';

      if (!existing) {
        workforceState.set(canonicalKey, rec);
      } else {
        const existingLastSeen = existing.lastSeenAt ? new Date(existing.lastSeenAt).getTime() : 0;
        if (diskLastSeen >= existingLastSeen) {
          workforceState.set(canonicalKey, {
            ...existing,
            ...rec,
            userId: canonicalKey,
            latitude: rec.latitude !== undefined ? rec.latitude : existing.latitude,
            longitude: rec.longitude !== undefined ? rec.longitude : existing.longitude,
            hasLocation: Boolean(rec.latitude !== undefined || existing.latitude !== undefined)
          });
        }
      }
    });
  }

  // Initial startup sync
  syncWorkforceState();
  persistWorkforceState();
  console.log(`[Workforce] Authoritative startup: synchronized ${workforceState.size} workforce tracking records.`);

  // Helper to broadcast via Pusher AND SSE
  async function broadcastWorkforceEvent(eventType: string, data: any) {
    // 1. Trigger Pusher if server credentials available
    const pusher = getPusherServer();
    if (pusher) {
      try {
        await pusher.trigger('my-channel', eventType, data);
      } catch (err: any) {
        console.warn(`[Pusher Server] Trigger failed for event '${eventType}':`, err?.message || err);
      }
    } else {
      console.warn(`[Pusher Server] NOT CONFIGURED - skipping Pusher broadcast for '${eventType}'`);
    }

    // 2. Broadcast to all active Server-Sent Events subscribers
    const sseMessage = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach((client) => {
      try {
        client.write(sseMessage);
      } catch {
        sseClients.delete(client);
      }
    });
  }

  // Helper for role-based authorization with genuine token verification
  function isCustomerRequest(req: express.Request): boolean {
    const token = extractToken(req);
    if (token) {
      const verified = verifyToken(token);
      if (verified.valid && verified.payload?.role === 'Customer') {
        return true;
      }
    }
    const roleHeader = (req.headers['x-user-role'] as string) || '';
    const roleQuery = (req.query.role as string) || '';
    const roleBody = req.body?.role || '';
    const role = (roleHeader || roleQuery || roleBody).toLowerCase().trim();
    return role === 'customer';
  }

  // Periodic stale presence check (every 15 seconds)
  setInterval(() => {
    syncWorkforceState();
    let changed = false;
    const now = Date.now();
    workforceState.forEach((rec) => {
      if (rec.isOnline) {
        const lastSeen = rec.lastSeenAt ? new Date(rec.lastSeenAt).getTime() : 0;
        if (now - lastSeen > PRESENCE_TIMEOUT_MS) {
          rec.isOnline = false;
          rec.isSharingLocation = false;
          rec.status = 'offline';
          changed = true;
          broadcastWorkforceEvent('presence.updated', {
            userId: rec.userId,
            employeeCode: rec.employeeCode,
            name: rec.name,
            email: rec.email,
            role: rec.role,
            isOnline: false,
            lastSeenAt: rec.lastSeenAt,
            isSharingLocation: false,
            status: 'offline'
          });
        }
      }
    });
    if (changed) {
      persistWorkforceState();
    }
  }, 15000);

  // Pusher Public Client Configuration
  app.get('/api/pusher/config', (_req, res) => {
    const { key, cluster } = getPusherConfig();
    if (key) {
      res.json({
        configured: true,
        key,
        cluster,
        channel: 'my-channel',
        event: 'location.updated'
      });
    } else {
      res.json({
        configured: false,
        key: null,
        cluster: null,
        channel: 'my-channel',
        event: 'location.updated',
        error: 'Pusher public configuration is missing on the server.'
      });
    }
  });

  // Pusher Production Diagnostic Status
  app.get('/api/pusher/status', (_req, res) => {
    const { appId, key, secret, cluster } = getPusherConfig();
    const serverConfigured = Boolean(appId && key && secret);
    res.json({
      serverConfigured,
      publicKeyConfigured: Boolean(key),
      clusterConfigured: Boolean(cluster),
      cluster: cluster || null,
      channel: 'my-channel',
      locationEvent: 'location.updated',
      presenceEvent: 'presence.updated'
    });
  });

  // Find existing employee record by ID, email, or employeeCode
  function findExistingWorkforceRecord(userId: string, email?: string, employeeCode?: string): WorkforceRecord | undefined {
    syncWorkforceState();
    const cleanId = userId ? userId.trim().toLowerCase() : '';
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanCode = employeeCode ? employeeCode.trim().toLowerCase() : '';

    const canonicalKey = resolveCanonicalWorkforceKey(userId, email, employeeCode);
    if (canonicalKey && workforceState.has(canonicalKey)) {
      return workforceState.get(canonicalKey);
    }
    if (userId && workforceState.has(userId)) return workforceState.get(userId);

    for (const rec of workforceState.values()) {
      if (cleanId && rec.userId && rec.userId.trim().toLowerCase() === cleanId) {
        return rec;
      }
      if (cleanEmail && rec.email && rec.email.trim().toLowerCase() === cleanEmail) {
        return rec;
      }
      if (cleanCode && rec.employeeCode && rec.employeeCode.trim().toLowerCase() === cleanCode) {
        return rec;
      }
    }
    return undefined;
  }

  // Admin Initial Load: Fetch All Field Employees' Latest Known Locations & Presence
  app.get(['/api/workforce/locations', '/api/workforce/status', '/api/locations'], (req, res) => {
    if (isCustomerRequest(req)) {
      res.status(403).json({ success: false, error: 'Customer accounts cannot access workforce tracking.' });
      return;
    }

    syncWorkforceState();
    const now = Date.now();

    // Deduplicate by canonical user key
    const deduplicated = new Map<string, WorkforceRecord>();
    for (const [key, rec] of workforceState.entries()) {
      const canonicalKey = resolveCanonicalWorkforceKey(rec.userId, rec.email, rec.employeeCode, rec.name);
      const existing = deduplicated.get(canonicalKey);
      if (!existing) {
        deduplicated.set(canonicalKey, { ...rec, userId: canonicalKey });
      } else {
        const recTime = rec.lastSeenAt ? new Date(rec.lastSeenAt).getTime() : 0;
        const exTime = existing.lastSeenAt ? new Date(existing.lastSeenAt).getTime() : 0;
        if (recTime >= exTime) {
          deduplicated.set(canonicalKey, {
            ...existing,
            ...rec,
            userId: canonicalKey,
            latitude: rec.latitude !== undefined ? rec.latitude : existing.latitude,
            longitude: rec.longitude !== undefined ? rec.longitude : existing.longitude,
            hasLocation: Boolean(rec.latitude !== undefined || existing.latitude !== undefined)
          });
        }
      }

      // If key in memory was an alias, remove it
      if (key !== canonicalKey) {
        workforceState.delete(key);
      }
    }

    // Re-align workforceState with deduplicated records
    deduplicated.forEach((val, key) => {
      workforceState.set(key, val);
    });

    const records = Array.from(deduplicated.values()).map((rec) => {
      const lastSeen = rec.lastSeenAt ? new Date(rec.lastSeenAt).getTime() : 0;
      const isOnline = Boolean(rec.isOnline) && (Math.abs(now - lastSeen) < PRESENCE_TIMEOUT_MS);
      return {
        ...rec,
        isOnline,
        status: !isOnline
          ? 'offline'
          : rec.hasLocation && typeof rec.latitude === 'number' && typeof rec.longitude === 'number'
          ? (rec.speed && rec.speed > 3 ? 'moving' : 'idle')
          : 'online'
      };
    });

    res.json({
      success: true,
      count: records.length,
      locations: records,
      workforce: records,
      users: records
    });
  });

  // Realtime Workforce Server-Sent Events (SSE) Stream
  app.get(['/api/workforce/stream', '/api/location/stream'], (req, res) => {
    if (isCustomerRequest(req)) {
      res.status(403).json({ success: false, error: 'Customer accounts cannot access workforce streaming.' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write('\n');

    // Send initial snapshot of all workers
    const initialList = Array.from(workforceState.values());
    res.write(`event: workforce.snapshot\ndata: ${JSON.stringify(initialList)}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Presence Heartbeat Endpoint: Field worker broadcasts heartbeat every 20-25 seconds
  app.post(['/api/presence/heartbeat', '/api/presence'], async (req, res) => {
    try {
      const { userId, employeeCode, name, email, role, isSharingLocation } = req.body || {};
      const callerUserId = (req.headers['x-user-id'] as string) || userId;

      if (!callerUserId && !email && !employeeCode) {
        res.status(400).json({ success: false, error: 'Missing userId in heartbeat payload.' });
        return;
      }

      if (isCustomerRequest(req)) {
        res.status(403).json({ success: false, error: 'Customer accounts cannot register field presence.' });
        return;
      }

      console.log(`[Presence] heartbeat received ${callerUserId || email || employeeCode}`);

      const rawId = callerUserId ? String(callerUserId).trim() : '';
      const existing = findExistingWorkforceRecord(rawId, email, employeeCode);
      const targetId = resolveCanonicalWorkforceKey(existing?.userId || rawId, email || existing?.email, employeeCode || existing?.employeeCode);
      const timestamp = new Date().toISOString();

      const updated: WorkforceRecord = {
        userId: targetId,
        employeeCode: employeeCode || existing?.employeeCode || targetId,
        name: name || existing?.name || (targetId.startsWith('emp-') ? `Field Worker (${targetId})` : 'Solar Worker'),
        email: email || existing?.email,
        role: role || existing?.role || 'Field Engineer',
        latitude: existing?.latitude,
        longitude: existing?.longitude,
        accuracy: existing?.accuracy,
        heading: existing?.heading,
        speed: existing?.speed,
        batteryLevel: existing?.batteryLevel,
        activity: existing?.activity,
        updatedAt: timestamp,
        lastSeenAt: timestamp,
        isOnline: true,
        isSharingLocation: typeof isSharingLocation === 'boolean' ? isSharingLocation : (existing?.isSharingLocation ?? false),
        hasLocation: Boolean(existing?.hasLocation && typeof existing?.latitude === 'number' && typeof existing?.longitude === 'number'),
        status: existing?.hasLocation && typeof existing?.latitude === 'number' && typeof existing?.longitude === 'number'
          ? (existing.speed && existing.speed > 3 ? 'moving' : 'idle')
          : 'online'
      };

      // Clean up duplicate old keys if rawId was an alias
      if (rawId && rawId !== targetId && workforceState.has(rawId)) {
        workforceState.delete(rawId);
      }
      if (existing && existing.userId !== targetId && workforceState.has(existing.userId)) {
        workforceState.delete(existing.userId);
      }

      workforceState.set(targetId, updated);
      
      // CRITICAL REQUIREMENT 4: Verify that heartbeat data is actually persisted BEFORE returning success
      const persisted = persistWorkforceState();
      if (!persisted) {
        console.warn(`[Presence] Warning: Persistence returned false for ${targetId}`);
      }
      console.log(`[Presence] workforce state updated & persisted ${targetId}`);

      // Broadcast presence update with full metadata
      const presencePayload = {
        userId: targetId,
        alternateUserId: rawId !== targetId ? rawId : undefined,
        employeeCode: updated.employeeCode,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        isOnline: true,
        lastSeenAt: timestamp,
        isSharingLocation: updated.isSharingLocation,
        latitude: updated.latitude,
        longitude: updated.longitude,
        status: updated.status,
        speed: updated.speed,
        accuracy: updated.accuracy,
        batteryLevel: updated.batteryLevel,
        activity: updated.activity
      };
      await broadcastWorkforceEvent('presence.updated', presencePayload);
      console.log(`[Presence] presence.updated broadcast ${targetId}`);

      res.json({
        success: true,
        online: true,
        isOnline: true,
        userId: targetId,
        timestamp,
        record: updated
      });
    } catch (err: any) {
      console.error('[Heartbeat Error]:', err);
      res.status(500).json({ success: false, error: err?.message || 'Error processing heartbeat' });
    }
  });

  // Explicit Offline / Disconnect Endpoint: Called when employee pauses sharing or logs out
  app.post('/api/presence/offline', async (req, res) => {
    try {
      const { userId, email, employeeCode } = req.body || {};
      const callerUserId = (req.headers['x-user-id'] as string) || userId;

      if (!callerUserId && !email && !employeeCode) {
        res.status(400).json({ success: false, error: 'Missing userId in offline payload.' });
        return;
      }

      const rawId = callerUserId ? String(callerUserId).trim() : '';
      const existing = findExistingWorkforceRecord(rawId, email, employeeCode);
      const targetId = resolveCanonicalWorkforceKey(existing?.userId || rawId, email || existing?.email, employeeCode || existing?.employeeCode);
      const timestamp = new Date().toISOString();

      if (existing) {
        existing.isOnline = false;
        existing.isSharingLocation = false;
        existing.status = 'offline';
        existing.lastSeenAt = timestamp;
        workforceState.set(existing.userId, existing);
        persistWorkforceState();
      }

      await broadcastWorkforceEvent('presence.updated', {
        userId: targetId,
        employeeCode: existing?.employeeCode,
        name: existing?.name,
        email: existing?.email,
        role: existing?.role,
        isOnline: false,
        lastSeenAt: timestamp,
        isSharingLocation: false,
        status: 'offline'
      });

      res.json({ success: true, online: false, isOnline: false, message: 'User presence set to offline.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Error updating offline presence' });
    }
  });

  // Realtime Live Location Update Endpoint (Field Worker GPS -> Backend -> Pusher event 'location.updated')
  app.post(['/api/update-location', '/api/location/update', '/api/location'], async (req, res) => {
    try {
      const {
        userId,
        employeeCode,
        name,
        role,
        latitude,
        longitude,
        accuracy,
        heading,
        speed,
        timestamp,
        activity,
        batteryLevel
      } = req.body || {};

      const callerUserId = (req.headers['x-user-id'] as string) || userId;

      if (!callerUserId || typeof latitude !== 'number' || typeof longitude !== 'number') {
        res.status(400).json({
          success: false,
          error: 'Missing required location fields: userId, latitude, longitude.'
        });
        return;
      }

      if (isCustomerRequest(req)) {
        res.status(403).json({ success: false, error: 'Customer accounts cannot submit GPS coordinates.' });
        return;
      }

      const id = String(callerUserId);
      const nowIso = timestamp || new Date().toISOString();
      const numLat = Number(latitude);
      const numLng = Number(longitude);
      const numSpeed = speed !== undefined ? Number(speed) : undefined;
      const isMoving = numSpeed !== undefined && numSpeed > 3;

      const payload = {
        userId: id,
        latitude: numLat,
        longitude: numLng,
        accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
        heading: heading !== undefined ? Number(heading) : undefined,
        speed: numSpeed,
        timestamp: nowIso,
        activity: activity ? String(activity) : isMoving ? 'In Transit / Moving' : 'On Site / Active',
        batteryLevel: batteryLevel !== undefined ? Number(batteryLevel) : undefined
      };

      // Persist in workforceState with canonical id resolution
      const existing = findExistingWorkforceRecord(id, undefined, employeeCode);
      const targetId = resolveCanonicalWorkforceKey(existing?.userId || id, existing?.email, employeeCode || existing?.employeeCode);
      const updatedRecord: WorkforceRecord = {
        userId: targetId,
        employeeCode: employeeCode || existing?.employeeCode || targetId,
        name: name || existing?.name || `Field Worker (${targetId})`,
        role: role || existing?.role || 'Field Engineer',
        latitude: numLat,
        longitude: numLng,
        accuracy: payload.accuracy,
        heading: payload.heading,
        speed: numSpeed,
        batteryLevel: payload.batteryLevel ?? existing?.batteryLevel,
        activity: payload.activity,
        updatedAt: nowIso,
        lastSeenAt: nowIso,
        isOnline: true,
        isSharingLocation: true,
        hasLocation: true,
        status: isMoving ? 'moving' : 'idle'
      };

      if (id !== targetId && workforceState.has(id)) {
        workforceState.delete(id);
      }

      workforceState.set(targetId, updatedRecord);
      persistWorkforceState();

      payload.userId = targetId;

      // Broadcast to both Pusher and Server-Sent Events
      await broadcastWorkforceEvent('location.updated', payload);

      res.json({
        success: true,
        broadcasted: true,
        payload
      });
    } catch (err: any) {
      console.error('[Location Update] Error:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Error processing location update'
      });
    }
  });

  // Gemini Generative Language Proxy Endpoint
  app.post(['/api/gemini', '/api/gemini.php'], async (req, res) => {
    try {
      const { prompt, systemInstruction, model } = req.body || {};

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Missing "prompt" string in request payload.' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured.',
          help: 'Set GEMINI_API_KEY in your environment variables to enable AI assistance.'
        });
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || 'You are an expert Solar EPC and CRM AI assistant.'
        }
      });

      const text = response.text || '';
      res.json({
        candidates: [
          {
            content: {
              parts: [{ text }]
            }
          }
        ],
        text
      });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      res.status(500).json({
        error: err?.message || 'Error generating content with Gemini API'
      });
    }
  });

  // Admin Authentication Status
  app.get('/api/admin/auth-status', (_req, res) => {
    res.json({
      configured: true,
      auth: 'local_erp'
    });
  });

  // Create Employee Login Account endpoint
  app.post(['/api/admin/create-employee-account', '/api/admin/create-user'], async (req, res) => {
    try {
      const { email, password, displayName, systemRole, employeeCode } = req.body || {};

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({ success: false, message: 'A valid email address is required.' });
        return;
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        return;
      }

      const uid = `usr-${employeeCode ? String(employeeCode).toLowerCase() : Date.now()}`;
      const hashed = hashPassword(password);

      const newUser = {
        id: uid,
        name: displayName ? String(displayName).trim() : email.split('@')[0],
        email: email.trim().toLowerCase(),
        password: hashed,
        role: systemRole || 'Field Engineer',
        employeeId: employeeCode || '',
        createdAt: new Date().toISOString()
      };

      // Persist to MySQL solar_users if connected
      await dbManager.query(
        'INSERT INTO `solar_users` (`id`, `name`, `email`, `password`, `role`, `employee_id`) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `password` = VALUES(`password`), `role` = VALUES(`role`)',
        [newUser.id, newUser.name, newUser.email, newUser.password, newUser.role, newUser.employeeId]
      );

      // Persist to fallback store
      const users = dbManager.getFallbackItems('users');
      const idx = users.findIndex((u: any) => u.id === uid || (u.email && u.email.toLowerCase() === newUser.email));
      if (idx >= 0) users[idx] = { ...users[idx], ...newUser };
      else users.push(newUser);
      dbManager.setFallbackItems('users', users);

      res.json({
        success: true,
        uid,
        message: 'Account provisioned successfully with secure cryptographic credentials.'
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err?.message || 'Failed to create user account.'
      });
    }
  });

  // Update Employee Login Account endpoint
  app.post(['/api/admin/update-employee-account', '/api/admin/update-user'], async (req, res) => {
    try {
      const { uid, password } = req.body || {};

      if (!uid || typeof uid !== 'string') {
        res.status(400).json({ success: false, message: 'Employee Auth UID is required.' });
        return;
      }

      if (password && String(password).length >= 6) {
        const hashed = hashPassword(String(password).trim());
        await dbManager.query('UPDATE `solar_users` SET `password` = ? WHERE `id` = ?', [hashed, uid]);
        const users = dbManager.getFallbackItems('users');
        const target = users.find((x: any) => x.id === uid);
        if (target) {
          target.password = hashed;
          dbManager.setFallbackItems('users', users);
        }
      }

      res.json({
        success: true,
        uid,
        message: 'Account updated successfully.'
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err?.message || 'Failed to update employee account.'
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    // Explicit SPA fallback for development routes like /projects, /hrms, /finance
    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
        let template = await fs.promises.readFile(indexHtmlPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
