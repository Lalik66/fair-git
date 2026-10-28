/**
 * HTTP tests for POST /api/admin/users/bulk-delete.
 *
 * The CI job runs `npm test` with no database (only `prisma generate`), so —
 * like the existing smoke tests — this suite never hits a live DB. Instead it
 * spies on the exported Prisma client so `authenticateToken` (which looks the
 * caller up by id) and the route's own queries resolve to fixtures. A real JWT
 * is minted with the app's own JWT_SECRET so requests pass the auth middleware
 * exactly as production ones would.
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app, prisma } from '../src/index';
import { JWT_SECRET } from '../src/config/env';

const ADMIN_ID = 'admin-1';

const sign = (userId: string) => jwt.sign({ userId }, JWT_SECRET, { algorithm: 'HS256' });
const adminToken = sign(ADMIN_ID);

const post = (body: unknown, token: string | null = adminToken) => {
  const req = request(app).post('/api/admin/users/bulk-delete');
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.send(body as object);
};

// Make the authenticated caller resolve to an active admin by default.
const mockCaller = (overrides: Record<string, unknown> = {}) => {
  (prisma.user.findUnique as unknown as jest.Mock).mockResolvedValue({
    id: ADMIN_ID,
    email: 'admin@test.local',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    isActive: true,
    ...overrides,
  });
};

let findUniqueSpy: jest.SpyInstance;
let findManySpy: jest.SpyInstance;
let updateSpy: jest.SpyInstance;
let transactionSpy: jest.SpyInstance;
let adminLogSpy: jest.SpyInstance;

// Rows returned by the "which of these are still deletable" lookup.
const rows = (...ids: string[]) => ids.map((id) => ({ id, email: `${id}@test.local` }));

beforeEach(() => {
  findUniqueSpy = jest.spyOn(prisma.user, 'findUnique');
  findManySpy = jest.spyOn(prisma.user, 'findMany');
  updateSpy = jest.spyOn(prisma.user, 'update').mockImplementation(((args: unknown) => args) as never);
  transactionSpy = jest
    .spyOn(prisma, '$transaction')
    .mockImplementation((async (ops: unknown[]) => ops) as never);
  adminLogSpy = jest.spyOn(prisma.adminLog, 'create').mockResolvedValue({} as never);
  mockCaller();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('POST /api/admin/users/bulk-delete', () => {
  describe('authorization', () => {
    it('rejects with no token (401) and never queries', async () => {
      const res = await post({ userIds: ['u1'] }, null);
      expect(res.status).toBe(401);
      expect(transactionSpy).not.toHaveBeenCalled();
    });

    it('rejects a non-admin caller (403)', async () => {
      mockCaller({ id: 'user-1', role: 'user' });
      const res = await post({ userIds: ['u1'] }, sign('user-1'));
      expect(res.status).toBe(403);
      expect(transactionSpy).not.toHaveBeenCalled();
    });
  });

  describe('input validation', () => {
    it('400 when userIds is missing/empty', async () => {
      const res = await post({ userIds: [] });
      expect(res.status).toBe(400);
      expect(transactionSpy).not.toHaveBeenCalled();
    });

    it('400 when userIds is not an array', async () => {
      const res = await post({ userIds: 'not-an-array' });
      expect(res.status).toBe(400);
      expect(transactionSpy).not.toHaveBeenCalled();
    });

    it('400 when userIds contains non-strings', async () => {
      const res = await post({ userIds: ['u1', 42] });
      expect(res.status).toBe(400);
      expect(transactionSpy).not.toHaveBeenCalled();
    });

    it('400 when the batch exceeds the cap', async () => {
      const tooMany = Array.from({ length: 101 }, (_, i) => `u${i}`);
      const res = await post({ userIds: tooMany });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/max/i);
      expect(transactionSpy).not.toHaveBeenCalled();
    });

    it('400 when only the caller is selected (nothing deletable)', async () => {
      const res = await post({ userIds: [ADMIN_ID] });
      expect(res.status).toBe(400);
      expect(transactionSpy).not.toHaveBeenCalled();
    });
  });

  describe('deletion', () => {
    it('soft-deletes the selected users, releases their emails and reports the count (200)', async () => {
      findManySpy.mockResolvedValue(rows('u1', 'u2') as never);
      const res = await post({ userIds: ['u1', 'u2'] });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ deletedCount: 2, requestedCount: 2, skippedCount: 0 });
      // Scoped to not-yet-deleted rows, excluding the caller.
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['u1', 'u2'] }, deletedAt: null } })
      );
      // One atomic transaction; each row is stamped and its email tombstoned.
      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'u1', deletedAt: null },
        data: expect.objectContaining({
          isActive: false,
          deletedAt: expect.any(Date),
          email: 'deleted_u1_u1@test.local',
          googleId: null,
          passwordHash: null,
        }),
      });
      expect(adminLogSpy).toHaveBeenCalledTimes(1);
    });

    it('excludes the caller even when selected alongside others', async () => {
      findManySpy.mockResolvedValue(rows('u1') as never);
      const res = await post({ userIds: [ADMIN_ID, 'u1'] });

      expect(res.status).toBe(200);
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['u1'] }, deletedAt: null } })
      );
    });

    it('reports a partial batch (skippedCount > 0) with 200', async () => {
      findManySpy.mockResolvedValue(rows('u1') as never);
      const res = await post({ userIds: ['u1', 'u2'] });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ deletedCount: 1, requestedCount: 2, skippedCount: 1 });
    });

    it('400 when nothing was deleted (all already gone/invalid)', async () => {
      findManySpy.mockResolvedValue([] as never);
      const res = await post({ userIds: ['ghost'] });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no users were deleted/i);
      expect(transactionSpy).not.toHaveBeenCalled();
      expect(adminLogSpy).not.toHaveBeenCalled();
    });
  });
});
