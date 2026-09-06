import { prisma } from "../config/database";

export interface FeatureSelection {
  expenses?: boolean;
  incomes?: boolean;
  budgets?: boolean;
  goals?: boolean;
  bills?: boolean;
  subscriptions?: boolean;
  smartSavings?: boolean;
  salaryRecords?: boolean;
  notifications?: boolean;
  auditLogs?: boolean;
  investments?: boolean;
  loans?: boolean;
  insurances?: boolean;
  taxProfiles?: boolean;
  documents?: boolean;
  events?: boolean;
  customCategories?: boolean;
  initialBalance?: boolean;
  contacts?: boolean;
}


export interface DataClearOptions {
  userEmail: string;
  features: FeatureSelection;
  confirmDelete: boolean;
  includeSyncedContacts?: boolean;
}

export interface DomainClearResult {
  domain: string;
  requested: boolean;
  deletedCount: number;
  protectedCount: number;
}

export interface DataClearReport {
  user: { id: string; email: string; name: string | null };
  executed: boolean;
  results: DomainClearResult[];
  totalDeleted: number;
  totalProtected: number;
}

export class DataClearService {
  async processClearRequest(options: DataClearOptions): Promise<DataClearReport> {
    const { userEmail, features, confirmDelete } = options;

    const user = await prisma.user.findUnique({
      where: { email: userEmail.trim().toLowerCase() },
      select: { id: true, email: true, name: true },
    });


    if (!user) {
      throw new Error(`User with email "${userEmail}" was not found.`);
    }

    const userId = user.id;
    const results: DomainClearResult[] = [];
    let totalDeleted = 0;
    let totalProtected = 0;

    // 1. EXPENSES (Protected: isAutoSynced == true)
    if (features.expenses) {
      const protectedCount = await prisma.expense.count({
        where: { userId, isAutoSynced: true, deletedAt: null },
      });
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.expense.deleteMany({
          where: { userId, isAutoSynced: false },
        });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.expense.count({
          where: { userId, isAutoSynced: false, deletedAt: null },
        });
      }
      results.push({ domain: "Expenses", requested: true, deletedCount, protectedCount });
      totalDeleted += deletedCount;
      totalProtected += protectedCount;
    }

    // 2. INCOMES (Protected: isAutoSynced == true)
    if (features.incomes) {
      const protectedCount = await prisma.income.count({
        where: { userId, isAutoSynced: true, deletedAt: null },
      });
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.income.deleteMany({
          where: { userId, isAutoSynced: false },
        });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.income.count({
          where: { userId, isAutoSynced: false, deletedAt: null },
        });
      }
      results.push({ domain: "Incomes", requested: true, deletedCount, protectedCount });
      totalDeleted += deletedCount;
      totalProtected += protectedCount;
    }

    // 3. SALARY RECORDS (Protected: isSynced == true)
    if (features.salaryRecords) {
      const protectedCount = await prisma.salaryRecord.count({
        where: { userId, isSynced: true },
      });
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.salaryRecord.deleteMany({
          where: { userId, isSynced: false },
        });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.salaryRecord.count({
          where: { userId, isSynced: false },
        });
      }
      results.push({ domain: "Salary Records", requested: true, deletedCount, protectedCount });
      totalDeleted += deletedCount;
      totalProtected += protectedCount;
    }

    // 4. BUDGETS
    if (features.budgets) {
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.budget.deleteMany({ where: { userId } });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.budget.count({ where: { userId } });
      }
      results.push({ domain: "Budgets", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 5. GOALS
    if (features.goals) {
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.goal.deleteMany({ where: { userId } });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.goal.count({ where: { userId } });
      }
      results.push({ domain: "Goals", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 6. BILLS
    if (features.bills) {
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.bill.deleteMany({ where: { userId } });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.bill.count({ where: { userId } });
      }
      results.push({ domain: "Bills", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 7. SUBSCRIPTIONS
    if (features.subscriptions) {
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.subscription.deleteMany({ where: { userId } });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.subscription.count({ where: { userId } });
      }
      results.push({ domain: "Subscriptions", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 8. SMART SAVINGS
    if (features.smartSavings) {
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.smartSaving.deleteMany({ where: { userId } });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.smartSaving.count({ where: { userId } });
      }
      results.push({ domain: "Smart Savings", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 9. NOTIFICATIONS
    if (features.notifications) {
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.notification.deleteMany({ where: { userId } });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.notification.count({ where: { userId } });
      }
      results.push({ domain: "Notifications", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 10. AUDIT LOGS
    if (features.auditLogs) {
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.auditLog.deleteMany({ where: { userId } });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.auditLog.count({ where: { userId } });
      }
      results.push({ domain: "Audit Logs", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 11. INVESTMENTS
    if (features.investments) {
      let deletedCount = 0;
      if (confirmDelete) {
        await prisma.investmentTransaction.deleteMany({ where: { userId } });
        const deleted = await prisma.investment.deleteMany({ where: { userId } });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.investment.count({ where: { userId } });
      }
      results.push({ domain: "Investments", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 12. LOANS
    if (features.loans) {
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.loan.deleteMany({ where: { userId } });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.loan.count({ where: { userId } });
      }
      results.push({ domain: "Loans", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 13. INSURANCES
    if (features.insurances) {
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.insurance.deleteMany({ where: { userId } });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.insurance.count({ where: { userId } });
      }
      results.push({ domain: "Insurances", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 14. TAX PROFILES
    if (features.taxProfiles) {
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.taxProfile.deleteMany({ where: { userId } });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.taxProfile.count({ where: { userId } });
      }
      results.push({ domain: "Tax Profiles", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 15. DOCUMENTS
    if (features.documents) {
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.document.deleteMany({ where: { userId } });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.document.count({ where: { userId } });
      }
      results.push({ domain: "Documents", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 16. EVENTS
    if (features.events) {
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.event.deleteMany({ where: { userId } });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.event.count({ where: { userId } });
      }
      results.push({ domain: "Events", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 17. CUSTOM CATEGORIES (only non-default)
    if (features.customCategories) {
      let deletedCount = 0;
      if (confirmDelete) {
        const deleted = await prisma.category.deleteMany({
          where: { userId, isDefault: false },
        });
        deletedCount = deleted.count;
      } else {
        deletedCount = await prisma.category.count({
          where: { userId, isDefault: false },
        });
      }
      results.push({ domain: "Custom Categories", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 18. INITIAL BALANCE
    if (features.initialBalance) {
      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { initialBalance: true },
      });
      const hasInitialBalance = userRecord?.initialBalance !== null && userRecord?.initialBalance !== undefined;
      const deletedCount = hasInitialBalance ? 1 : 0;
      if (confirmDelete && hasInitialBalance) {
        await prisma.user.update({
          where: { id: userId },
          data: { initialBalance: null },
        });
      }
      results.push({ domain: "Initial Balance", requested: true, deletedCount, protectedCount: 0 });
      totalDeleted += deletedCount;
    }

    // 19. CONTACTS & ADDRESSES
    if (features.contacts) {
      const includeSynced = Boolean(options.includeSyncedContacts);

      let protectedCount = 0;
      if (!includeSynced) {
        protectedCount = await prisma.contact.count({
          where: {
            userId,
            OR: [
              { isGoogleSynced: true },
              { tags: { hasSome: ["Google Sync", "google-synced"] } },
            ],
          },
        });
      }

      let deletedContactsCount = 0;
      let deletedAddressesCount = 0;

      if (confirmDelete) {
        if (includeSynced) {
          const deletedC = await prisma.contact.deleteMany({ where: { userId } });
          deletedContactsCount = deletedC.count;
        } else {
          const deletedC = await prisma.contact.deleteMany({
            where: {
              userId,
              isGoogleSynced: false,
              NOT: {
                tags: { hasSome: ["Google Sync", "google-synced"] },
              },
            },
          });
          deletedContactsCount = deletedC.count;
        }

        const deletedA = await prisma.address.deleteMany({ where: { userId } });
        deletedAddressesCount = deletedA.count;
      } else {
        if (includeSynced) {
          deletedContactsCount = await prisma.contact.count({ where: { userId } });
        } else {
          deletedContactsCount = await prisma.contact.count({
            where: {
              userId,
              isGoogleSynced: false,
              NOT: {
                tags: { hasSome: ["Google Sync", "google-synced"] },
              },
            },
          });
        }
        deletedAddressesCount = await prisma.address.count({ where: { userId } });
      }

      const totalDeletedCount = deletedContactsCount + deletedAddressesCount;
      results.push({
        domain: "Contacts & Addresses",
        requested: true,
        deletedCount: totalDeletedCount,
        protectedCount,
      });
      totalDeleted += totalDeletedCount;
      totalProtected += protectedCount;
    }

    return {

      user: { id: user.id, email: user.email, name: user.name },
      executed: confirmDelete,
      results,
      totalDeleted,
      totalProtected,
    };
  }
}

export const dataClearService = new DataClearService();
