import { userRepository } from "../repositories/user.repository";
import { AppError } from "../middleware/errorHandler";
import { supabaseAdmin } from "../config/supabase";
import { prisma } from "../config/database";

export class UserService {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    return user;
  }

  async updateProfile(userId: string, data: {
    name?: string;
    currency?: string;
    timezone?: string;
    theme?: string;
    monthlySalary?: number;
    avatarUrl?: string | null;
    initialBalance?: number;
  }) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");

    const updateData: any = { ...data };

    if (data.currency && user.currency !== data.currency) {
      const oldCurrency = user.currency;
      const newCurrency = data.currency;

      try {
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
        const exchangeData = await response.json() as { rates: Record<string, number> };
        const rate = exchangeData.rates[newCurrency] / exchangeData.rates[oldCurrency];

        if (rate && rate !== 1) {
          // Perform raw database transaction to update all monetary amounts
          await prisma.$transaction([
            prisma.$executeRawUnsafe('UPDATE users SET monthly_salary = monthly_salary * $1, initial_balance = initial_balance * $1 WHERE id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE incomes SET amount = amount * $1 WHERE user_id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE expenses SET amount = amount * $1 WHERE user_id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE salary_records SET base_salary = base_salary * $1, bonus = bonus * $1, other_deductions = other_deductions * $1, expected_salary = expected_salary * $1, actual_credited = actual_credited * $1 WHERE user_id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE budgets SET amount = amount * $1 WHERE user_id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE goals SET target_amount = target_amount * $1, current_amount = current_amount * $1, monthly_contribution = monthly_contribution * $1 WHERE user_id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE bills SET amount = amount * $1 WHERE user_id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE subscriptions SET amount = amount * $1 WHERE user_id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE investments SET average_price = average_price * $1, current_price = current_price * $1, invested_amount = invested_amount * $1 WHERE user_id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE investment_transactions SET price = price * $1, total_amount = total_amount * $1 WHERE user_id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE loans SET principal_amount = principal_amount * $1, outstanding_amount = outstanding_amount * $1, emi_amount = emi_amount * $1 WHERE user_id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE insurances SET premium_amount = premium_amount * $1, coverage_amount = coverage_amount * $1 WHERE user_id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE tax_profiles SET estimated_income = estimated_income * $1, total_deductions = total_deductions * $1, estimated_tax = estimated_tax * $1, tax_paid = tax_paid * $1, basic_salary = basic_salary * $1, hra = hra * $1, lta = lta * $1, special_allowance = special_allowance * $1, pf_deduction = pf_deduction * $1, pt_deduction = pt_deduction * $1, investments_80c = investments_80c * $1, medical_80d = medical_80d * $1, education_loan_80e = education_loan_80e * $1, home_loan_interest_24b = home_loan_interest_24b * $1, nps_80ccd = nps_80ccd * $1, other_deductions = other_deductions * $1 WHERE user_id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE smart_savings SET expected_cost = expected_cost * $1, actual_cost = actual_cost * $1, money_saved = money_saved * $1 WHERE user_id = $2', rate, userId),
            prisma.$executeRawUnsafe('UPDATE shared_wallets SET balance = balance * $1 WHERE family_group_id IN (SELECT group_id FROM group_members WHERE user_id = $2)', rate, userId),
            prisma.$executeRawUnsafe('UPDATE shared_wallet_transactions SET amount = amount * $1 WHERE user_id = $2', rate, userId),
          ]);
        }
      } catch (error) {
        console.error("Failed to convert currency values", error);
        throw new AppError(500, "CURRENCY_CONVERSION_FAILED", "Failed to convert historical data to new currency");
      }
    }
    
    // Only allow setting initialBalance if it is currently null
    if (data.initialBalance !== undefined) {
      if (user.initialBalance !== null) {
        delete updateData.initialBalance; // Ignore if already set
      }
    }

    return userRepository.update(userId, updateData);
  }

  async deleteAccount(userId: string, supabaseId: string) {
    await userRepository.softDelete(userId);
    await supabaseAdmin.auth.admin.deleteUser(supabaseId);
    return { message: "Account deleted successfully" };
  }
}

export const userService = new UserService();
