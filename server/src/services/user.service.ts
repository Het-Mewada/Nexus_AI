import { userRepository } from "../repositories/user.repository";
import { AppError } from "../middleware/errorHandler";
import { supabaseAdmin } from "../config/supabase";

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
  }) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");

    return userRepository.update(userId, data);
  }

  async deleteAccount(userId: string, supabaseId: string) {
    await userRepository.softDelete(userId);
    await supabaseAdmin.auth.admin.deleteUser(supabaseId);
    return { message: "Account deleted successfully" };
  }
}

export const userService = new UserService();
