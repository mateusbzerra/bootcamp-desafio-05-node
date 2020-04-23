import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}
class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const categoriesRepository = getRepository(Category);
    const hasCategory = await categoriesRepository.findOne({
      where: { title: category },
    });
    let category_id = hasCategory?.id;
    if (!hasCategory) {
      const newCategory = categoriesRepository.create({ title: category });
      await categoriesRepository.insert(newCategory);
      category_id = newCategory.id;
    }

    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const balance = await transactionsRepository.getBalance();
    if (type === 'outcome' && value > balance.total) {
      throw new AppError('Requested value is bigger than your current balance');
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id,
    });

    await transactionsRepository.insert(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
