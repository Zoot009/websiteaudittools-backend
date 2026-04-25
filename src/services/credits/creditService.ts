/**
 * Credit Service — single point of truth for all credit mutations.
 *
 * Design rules:
 *  - Every mutation is wrapped in a Prisma interactive transaction.
 *  - Every mutation that writes a CreditTransaction carries an idempotency key.
 *    If the key already exists the function returns early (no error, no double-charge).
 *  - Monthly quota credits (MONTHLY_QUOTA_GRANT) are tracked in the
 *    `monthlyQuotaBalance` sub-balance so they can be expired separately from
 *    purchased top-up credits at the end of each billing cycle.
 *  - Quota credits are always spent first (use-it-or-lose-it semantics).
 *    The `quotaConsumed` field on UsageReservation records how much came from
 *    the quota bucket so refunds can restore the correct sub-balance.
 */

import { prisma } from '../../lib/prisma.js';
import { $Enums } from '../../generated/prisma/client.js';

const { CreditTransactionType, ReservationJobType, ReservationStatus } = $Enums;

// ── Error class ──────────────────────────────────────────────────────────────

export class InsufficientCreditsError extends Error {
  readonly code = 'INSUFFICIENT_CREDITS';
  constructor(available: number, required: number) {
    super(`Insufficient credits: required ${required}, available ${available}`);
    this.name = 'InsufficientCreditsError';
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export type GrantableTransactionType =
  | typeof CreditTransactionType.PURCHASE
  | typeof CreditTransactionType.MONTHLY_QUOTA_GRANT
  | typeof CreditTransactionType.ADMIN_GRANT;

export type DebitableTransactionType =
  | typeof CreditTransactionType.CHAT_DEBIT;

// ── Helpers ──────────────────────────────────────────────────────────────────

function reserveTransactionType(
  jobType: typeof ReservationJobType[keyof typeof ReservationJobType],
): typeof CreditTransactionType[keyof typeof CreditTransactionType] {
  return jobType === ReservationJobType.AUDIT
    ? CreditTransactionType.AUDIT_RESERVE
    : CreditTransactionType.LINKGRAPH_RESERVE;
}

function settleTransactionType(
  jobType: typeof ReservationJobType[keyof typeof ReservationJobType],
): typeof CreditTransactionType[keyof typeof CreditTransactionType] {
  return jobType === ReservationJobType.AUDIT
    ? CreditTransactionType.AUDIT_SETTLE
    : CreditTransactionType.LINKGRAPH_SETTLE;
}

function refundTransactionType(
  jobType: typeof ReservationJobType[keyof typeof ReservationJobType],
): typeof CreditTransactionType[keyof typeof CreditTransactionType] {
  return jobType === ReservationJobType.AUDIT
    ? CreditTransactionType.AUDIT_REFUND
    : CreditTransactionType.LINKGRAPH_REFUND;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the current credit balance for a user.
 * Returns zeros for new users who have no CreditAccount yet.
 */
export async function getBalance(
  userId: string,
): Promise<{ available: number; reserved: number; monthlyQuota: number }> {
  const account = await prisma.creditAccount.findUnique({
    where: { userId },
    select: {
      availableBalance: true,
      reservedBalance: true,
      monthlyQuotaBalance: true,
    },
  });

  return {
    available: account?.availableBalance ?? 0,
    reserved: account?.reservedBalance ?? 0,
    monthlyQuota: account?.monthlyQuotaBalance ?? 0,
  };
}

/**
 * Reserves credits for an async job (audit or link-graph).
 *
 * - Atomically deducts from availableBalance and increases reservedBalance.
 * - Quota credits are spent first (use-it-or-lose-it).
 * - Records a UsageReservation (keyed by jobId @unique).
 * - Records a CreditTransaction (keyed by idempotencyKey @unique).
 * - Throws InsufficientCreditsError if the balance is too low.
 */
export async function reserve(
  userId: string,
  amount: number,
  jobId: string,
  jobType: typeof ReservationJobType[keyof typeof ReservationJobType],
  idempotencyKey: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Idempotency — if the transaction already exists, skip.
    const existing = await tx.creditTransaction.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existing) return;

    // Get or assert account exists with sufficient balance.
    const account = await tx.creditAccount.findUnique({
      where: { userId },
      select: {
        id: true,
        availableBalance: true,
        reservedBalance: true,
        monthlyQuotaBalance: true,
      },
    });

    const available = account?.availableBalance ?? 0;
    if (available < amount) {
      throw new InsufficientCreditsError(available, amount);
    }

    // Spend quota-bucket first, top-up second.
    const quotaConsumed = Math.min(amount, account?.monthlyQuotaBalance ?? 0);

    await tx.creditAccount.update({
      where: { userId },
      data: {
        availableBalance: { decrement: amount },
        reservedBalance: { increment: amount },
        monthlyQuotaBalance: { decrement: quotaConsumed },
      },
    });

    await tx.usageReservation.create({
      data: {
        userId,
        accountId: account!.id,
        jobId,
        jobType,
        creditsReserved: amount,
        quotaConsumed,
        status: ReservationStatus.PENDING,
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        accountId: account!.id,
        amount: -amount,
        type: reserveTransactionType(jobType),
        idempotencyKey,
        referenceType: jobType === ReservationJobType.AUDIT ? 'audit_job' : 'link_graph_job',
        referenceId: jobId,
        description: `Credits reserved for ${jobType.toLowerCase().replace('_', '-')} job ${jobId}`,
      },
    });
  });
}

/**
 * Settles a reservation after a job completes successfully.
 *
 * - Decrements reservedBalance (the job has been "paid for").
 * - availableBalance is unchanged — it was already decremented at reserve time.
 * - Marks the UsageReservation as SETTLED.
 * - Records a CreditTransaction.
 */
export async function settle(
  jobId: string,
  idempotencyKey: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Idempotency check.
    const existing = await tx.creditTransaction.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existing) return;

    const reservation = await tx.usageReservation.findUnique({
      where: { jobId },
    });
    if (!reservation) {
      throw new Error(`UsageReservation not found for jobId: ${jobId}`);
    }
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new Error(
        `Cannot settle reservation ${reservation.id}: status is ${reservation.status}`,
      );
    }

    await tx.creditAccount.update({
      where: { id: reservation.accountId },
      data: {
        reservedBalance: { decrement: reservation.creditsReserved },
      },
    });

    await tx.usageReservation.update({
      where: { jobId },
      data: {
        status: ReservationStatus.SETTLED,
        settledAt: new Date(),
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId: reservation.userId,
        accountId: reservation.accountId,
        amount: -reservation.creditsReserved,
        type: settleTransactionType(reservation.jobType),
        idempotencyKey,
        referenceType: reservation.jobType === ReservationJobType.AUDIT
          ? 'audit_job'
          : 'link_graph_job',
        referenceId: jobId,
        description: `Credits settled for ${reservation.jobType.toLowerCase().replace('_', '-')} job ${jobId}`,
      },
    });
  });
}

/**
 * Refunds a reservation when a job fails or is cancelled.
 *
 * - Returns the reserved credits to availableBalance.
 * - Restores quota credits back to monthlyQuotaBalance first (up to quotaConsumed).
 * - Marks the UsageReservation as REFUNDED.
 * - Records a CreditTransaction.
 */
export async function refund(
  jobId: string,
  idempotencyKey: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Idempotency check.
    const existing = await tx.creditTransaction.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existing) return;

    const reservation = await tx.usageReservation.findUnique({
      where: { jobId },
    });
    if (!reservation) {
      throw new Error(`UsageReservation not found for jobId: ${jobId}`);
    }
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new Error(
        `Cannot refund reservation ${reservation.id}: status is ${reservation.status}`,
      );
    }

    await tx.creditAccount.update({
      where: { id: reservation.accountId },
      data: {
        availableBalance: { increment: reservation.creditsReserved },
        reservedBalance: { decrement: reservation.creditsReserved },
        // Restore quota sub-balance as well.
        monthlyQuotaBalance: { increment: reservation.quotaConsumed },
      },
    });

    await tx.usageReservation.update({
      where: { jobId },
      data: {
        status: ReservationStatus.REFUNDED,
        refundedAt: new Date(),
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId: reservation.userId,
        accountId: reservation.accountId,
        amount: reservation.creditsReserved,
        type: refundTransactionType(reservation.jobType),
        idempotencyKey,
        referenceType: reservation.jobType === ReservationJobType.AUDIT
          ? 'audit_job'
          : 'link_graph_job',
        referenceId: jobId,
        description: `Credits refunded for failed ${reservation.jobType.toLowerCase().replace('_', '-')} job ${jobId}`,
      },
    });
  });
}

/**
 * Grants credits to a user (purchase, monthly quota, admin grant).
 *
 * - Upserts the CreditAccount so the function is safe for first-time grants.
 * - MONTHLY_QUOTA_GRANT also increments monthlyQuotaBalance.
 * - Fully idempotent: a duplicate idempotencyKey is silently ignored.
 */
export async function grant(
  userId: string,
  amount: number,
  type: GrantableTransactionType,
  description: string,
  idempotencyKey: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Idempotency check.
    const existing = await tx.creditTransaction.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existing) return;

    const isQuota = type === CreditTransactionType.MONTHLY_QUOTA_GRANT;

    const account = await tx.creditAccount.upsert({
      where: { userId },
      create: {
        userId,
        availableBalance: amount,
        lifetimeEarned: amount,
        monthlyQuotaBalance: isQuota ? amount : 0,
      },
      update: {
        availableBalance: { increment: amount },
        lifetimeEarned: { increment: amount },
        ...(isQuota ? { monthlyQuotaBalance: { increment: amount } } : {}),
      },
      select: { id: true },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        accountId: account.id,
        amount,
        type,
        idempotencyKey,
        description,
      },
    });
  });
}

/**
 * Expires unused monthly quota credits at the end of a billing cycle.
 *
 * - Reads the current monthlyQuotaBalance from the account (the actual unused
 *   amount) and expires min(monthlyQuotaBalance, amount) to guard against
 *   over-expiry edge cases.
 * - Does NOT touch purchased top-up credits.
 * - Fully idempotent via idempotencyKey.
 *
 * @param cycleKey  Human-readable label for the billing cycle, e.g. "2026-04".
 *                  Included in the transaction description.
 */
export async function expireMonthlyCredits(
  userId: string,
  amount: number,
  cycleKey: string,
  idempotencyKey: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Idempotency check.
    const existing = await tx.creditTransaction.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existing) return;

    const account = await tx.creditAccount.findUnique({
      where: { userId },
      select: {
        id: true,
        availableBalance: true,
        monthlyQuotaBalance: true,
      },
    });

    if (!account) return; // No account — nothing to expire.

    // Guard: never expire more than what's actually in the quota bucket.
    const toExpire = Math.min(amount, account.monthlyQuotaBalance);
    if (toExpire <= 0) return;

    await tx.creditAccount.update({
      where: { userId },
      data: {
        availableBalance: { decrement: toExpire },
        monthlyQuotaBalance: { decrement: toExpire },
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        accountId: account.id,
        amount: -toExpire,
        type: CreditTransactionType.MONTHLY_QUOTA_EXPIRE,
        idempotencyKey,
        referenceType: 'billing_cycle',
        referenceId: cycleKey,
        description: `Monthly quota expiry for cycle ${cycleKey}: ${toExpire} credit(s) unused`,
      },
    });
  });
}

/**
 * Immediately debits credits without reserving (used for chat messages and
 * other synchronous operations where there is no async job to settle/refund).
 *
 * - Fully idempotent via idempotencyKey.
 * - Throws InsufficientCreditsError if the balance is too low.
 */
export async function debitImmediate(
  userId: string,
  amount: number,
  type: DebitableTransactionType,
  referenceId: string,
  idempotencyKey: string,
): Promise<void> {
  if (amount === 0) return; // e.g. CHAT_MESSAGE_COST = 0 during free period

  await prisma.$transaction(async (tx) => {
    // Idempotency check.
    const existing = await tx.creditTransaction.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (existing) return;

    const account = await tx.creditAccount.findUnique({
      where: { userId },
      select: {
        id: true,
        availableBalance: true,
        monthlyQuotaBalance: true,
      },
    });

    const available = account?.availableBalance ?? 0;
    if (available < amount) {
      throw new InsufficientCreditsError(available, amount);
    }

    // Quota is spent first.
    const quotaConsumed = Math.min(amount, account?.monthlyQuotaBalance ?? 0);

    await tx.creditAccount.update({
      where: { userId },
      data: {
        availableBalance: { decrement: amount },
        monthlyQuotaBalance: { decrement: quotaConsumed },
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        accountId: account!.id,
        amount: -amount,
        type,
        idempotencyKey,
        referenceType: 'chat_message',
        referenceId,
        description: `Immediate debit for ${type.toLowerCase()} (ref: ${referenceId})`,
      },
    });
  });
}
