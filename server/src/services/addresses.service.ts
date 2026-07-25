import { prisma } from '../config/database';

export class AddressesService {
  async getAddresses(userId: string, search?: string) {
    if (search) {
      return prisma.address.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            { state: { contains: search, mode: 'insensitive' } },
            { country: { contains: search, mode: 'insensitive' } },
          ],
        },
        orderBy: { title: 'asc' },
      });
    }

    return prisma.address.findMany({
      where: { userId },
      orderBy: { title: 'asc' },
    });
  }

  async getAddress(userId: string, id: string) {
    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw Object.assign(new Error('Address not found'), { statusCode: 404 });
    }
    return address;
  }

  async createAddress(userId: string, data: any) {
    return prisma.address.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async updateAddress(userId: string, id: string, data: any) {
    const address = await this.getAddress(userId, id);
    return prisma.address.update({
      where: { id: address.id },
      data,
    });
  }

  async deleteAddress(userId: string, id: string) {
    const address = await this.getAddress(userId, id);
    await prisma.address.delete({
      where: { id: address.id },
    });
    return { message: 'Address deleted successfully' };
  }
}
