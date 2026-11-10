import { Prisma } from '@prisma/client';
import { completedYears } from '../common/utils/age.util';

export const familyUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  birthDate: true,
} satisfies Prisma.UserSelect;
export const familyMembersInclude = {
  parent: { select: familyUserSelect },
  child: { select: familyUserSelect },
} satisfies Prisma.FamilyLinkInclude;
export function isCurrentMinor(birthDate?: Date | null): boolean {
  const age = birthDate ? completedYears(birthDate) : null;
  return age !== null && age < 18;
}
export async function lockFamilyUsers(tx: Prisma.TransactionClient, ids: string[]): Promise<void> {
  // All pairing/revocation/config writers lock the same rows in stable order.
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "User" WHERE "id" IN (${Prisma.join([...new Set(ids)].sort())}) ORDER BY "id" FOR UPDATE`,
  );
}
export async function hasActiveFamily(
  tx: Prisma.TransactionClient,
  childId: string,
  parentId?: string,
): Promise<boolean> {
  const child = await tx.user.findUnique({ where: { id: childId }, select: { birthDate: true } });
  if (!isCurrentMinor(child?.birthDate)) return false;
  return (
    (await tx.familyLink.count({
      where: { childId, ...(parentId ? { parentId } : {}), status: 'ACTIVE' },
    })) > 0
  );
}
