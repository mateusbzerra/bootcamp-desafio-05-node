import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';

import { getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import uploadConfig from '../config/upload';

interface Request {
  fileName: string;
}

interface TransactionInput {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute({ fileName }: Request): Promise<Transaction[]> {
    const fileDir = path.join(uploadConfig.directory, fileName);
    const readCSVStream = fs.createReadStream(fileDir);

    const parseStream = csvParse({
      ltrim: true,
      rtrim: true,
      trim: true,
      columns: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const categories: Array<string> = [];
    const transactions: Array<TransactionInput> = [];

    const transactionsRepository = getRepository(Transaction);
    const categoriesRepository = getRepository(Category);

    parseCSV.on('data', async line => {
      transactions.push(line);
      categories.push(line.category);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    function removeDuplicatedCategories(names: Array<string>): Array<string> {
      const unique: Record<string, boolean> = {};
      names.forEach((i: string) => {
        if (!unique[i]) {
          unique[i] = true;
        }
      });
      return Object.keys(unique);
    }

    const nonDuplicateCategories = removeDuplicatedCategories(categories);
    const categoriesWithId: Array<Category> = [];

    nonDuplicateCategories.forEach(async (category: string) => {
      const newCategory = categoriesRepository.create({ title: category });
      categoriesWithId.push(newCategory);
    });

    await categoriesRepository.insert(categoriesWithId);

    const transactionsWithCategory: Array<Transaction> = [];
    transactions.forEach(async (transaction: TransactionInput) => {
      const getCategoryIndex = categoriesWithId.findIndex(
        category => category.title === transaction.category,
      );
      const newTrans = transactionsRepository.create({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category_id: categoriesWithId[getCategoryIndex].id,
      });
      transactionsWithCategory.push(newTrans);
    });

    await transactionsRepository.insert(transactionsWithCategory);

    const getAllTransactions = await transactionsRepository.find();
    return getAllTransactions;
  }
}

export default ImportTransactionsService;
