import { prisma } from '../config/database';

export class ContactsService {
  async getContacts(userId: string, search?: string) {
    if (search) {
      return prisma.contact.findMany({
        where: {
          userId,
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { relationship: { contains: search, mode: 'insensitive' } },
          ],
        },
        orderBy: { name: 'asc' },
      });
    }

    return prisma.contact.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async getContact(userId: string, id: string) {
    const contact = await prisma.contact.findFirst({
      where: { id, userId },
    });

    if (!contact) {
      throw Object.assign(new Error('Contact not found'), { statusCode: 404 });
    }
    return contact;
  }

  async createContact(userId: string, data: any) {
    return prisma.contact.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async bulkCreateContacts(userId: string, data: any[]) {
    const contactsData = data.map(contact => ({
      ...contact,
      userId,
    }));

    const result = await prisma.contact.createMany({
      data: contactsData,
    });

    return { count: result.count };
  }

  async updateContact(userId: string, id: string, data: any) {
    const contact = await this.getContact(userId, id);
    return prisma.contact.update({
      where: { id: contact.id },
      data,
    });
  }

  async deleteContact(userId: string, id: string) {
    const contact = await this.getContact(userId, id);
    await prisma.contact.delete({
      where: { id: contact.id },
    });
    return { message: 'Contact deleted successfully' };
  }
}

export const contactsService = new ContactsService();
