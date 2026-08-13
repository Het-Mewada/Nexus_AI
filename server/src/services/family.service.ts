import { prisma } from '../config/database';
import { randomBytes } from 'crypto';

export class FamilyService {
  async createGroup(userId: string, name: string) {
    const inviteCode = randomBytes(4).toString('hex').toUpperCase();

    // The user creating the group becomes the OWNER
    const group = await prisma.familyGroup.create({
      data: {
        name,
        inviteCode,
        members: {
          create: {
            userId,
            role: 'OWNER',
          }
        }
      },
      include: {
        members: true,
      }
    });
    return group;
  }

  async joinGroup(userId: string, inviteCode: string) {
    const group = await prisma.familyGroup.findUnique({
      where: { inviteCode }
    });

    if (!group) throw new Error('Invalid invite code');

    const existingMember = await prisma.groupMember.findFirst({
      where: { userId, groupId: group.id }
    });

    if (existingMember) throw new Error('You are already a member of this group');

    return prisma.groupMember.create({
      data: {
        userId,
        groupId: group.id,
        role: 'MEMBER'
      },
      include: {
        group: true
      }
    });
  }

  async getMyGroups(userId: string) {
    return prisma.familyGroup.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        wallets: true
      }
    });
  }

  // ─── Shared Wallets ────────────────────────────────────────────────

  private async checkGroupAccess(userId: string, groupId: string) {
    const member = await prisma.groupMember.findFirst({
      where: { userId, groupId }
    });
    if (!member) throw new Error('You do not have access to this family group');
    return member;
  }

  async createWallet(userId: string, groupId: string, name: string) {
    await this.checkGroupAccess(userId, groupId);
    return prisma.sharedWallet.create({
      data: {
        familyGroupId: groupId,
        name,
      }
    });
  }

  async getWallets(userId: string, groupId: string) {
    await this.checkGroupAccess(userId, groupId);
    return prisma.sharedWallet.findMany({
      where: { familyGroupId: groupId },
      include: {
        transactions: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async updateWallet(userId: string, walletId: string, name: string) {
    const wallet = await prisma.sharedWallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new Error('Wallet not found');
    await this.checkGroupAccess(userId, wallet.familyGroupId);

    return prisma.sharedWallet.update({
      where: { id: walletId },
      data: { name }
    });
  }

  async deleteWallet(userId: string, walletId: string) {
    const wallet = await prisma.sharedWallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new Error('Wallet not found');
    
    // Only group owners can delete wallets
    const member = await this.checkGroupAccess(userId, wallet.familyGroupId);
    if (member.role !== 'OWNER') throw new Error('Only group owners can delete wallets');

    await prisma.sharedWallet.delete({ where: { id: walletId } });
    return { success: true };
  }

  // ─── Wallet Transactions ──────────────────────────────────────────

  async addWalletTransaction(userId: string, walletId: string, data: { type: string; amount: number; description?: string }) {
    const wallet = await prisma.sharedWallet.findUnique({
      where: { id: walletId },
      include: { familyGroup: true }
    });
    if (!wallet) throw new Error('Wallet not found');
    await this.checkGroupAccess(userId, wallet.familyGroupId);

    return prisma.$transaction(async (tx) => {
      const currentWallet = await tx.sharedWallet.findUnique({
        where: { id: walletId },
        include: { familyGroup: true }
      });
      
      if (!currentWallet) throw new Error('Wallet not found');
      
      if (data.type === 'WITHDRAWAL' && currentWallet.balance.lessThan(data.amount)) {
        throw new Error('Insufficient funds in shared wallet');
      }

      const transaction = await tx.sharedWalletTransaction.create({
        data: {
          walletId,
          userId,
          type: data.type,
          amount: data.amount,
          description: data.description
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          wallet: { select: { id: true, name: true } }
        }
      });

      await tx.sharedWallet.update({
        where: { id: walletId },
        data: {
          balance: data.type === 'DEPOSIT' 
            ? { increment: data.amount }
            : { decrement: data.amount }
        }
      });

      const groupName = currentWallet.familyGroup.name;

      if (data.type === 'DEPOSIT') {
        let category = await tx.category.findFirst({
          where: { name: { in: ["Family", "Transfer", "Transfers", "Other"] } }
        });
        if (!category) {
          category = await tx.category.findFirst();
        }

        if (category) {
          await tx.expense.create({
            data: {
              userId,
              amount: data.amount,
              categoryId: category.id,
              merchant: `Group: ${groupName}`,
              notes: `Deposit to shared wallet "${currentWallet.name}" (${groupName})${data.description ? ` - ${data.description}` : ''}`,
              paymentMethod: 'transfer',
              date: new Date(),
              isAutoSynced: true,
              syncSource: 'SHARED_WALLET_DEPOSIT',
            }
          });
        }
      } else if (data.type === 'WITHDRAWAL') {
        await tx.income.create({
          data: {
            userId,
            amount: data.amount,
            source: `Group: ${groupName} (${currentWallet.name})`,
            notes: `Shared wallet withdrawal from "${currentWallet.name}" (${groupName})${data.description ? ` - ${data.description}` : ''}`,
            date: new Date(),
            isAutoSynced: true,
            syncSource: 'SHARED_WALLET_WITHDRAWAL',
          }
        });
      }

      return transaction;
    });
  }

  async getWalletTransactions(userId: string, walletId: string) {
    const wallet = await prisma.sharedWallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new Error('Wallet not found');
    await this.checkGroupAccess(userId, wallet.familyGroupId);

    return prisma.sharedWalletTransaction.findMany({
      where: { walletId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        wallet: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getGroupTransactions(userId: string, groupId: string) {
    await this.checkGroupAccess(userId, groupId);

    return prisma.sharedWalletTransaction.findMany({
      where: {
        wallet: {
          familyGroupId: groupId
        }
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        wallet: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export const familyService = new FamilyService();
