import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    const outcomeSum = transactions.reduce((total, element) => {
      if (element.type === 'outcome') {
        const newValue = total + element.value;
        return newValue;
      }
      return total;
    }, 0);
    const incomeSum = transactions.reduce((total, element) => {
      if (element.type === 'income') {
        const newValue = total + element.value;
        return newValue;
      }
      return total;
    }, 0);

    return {
      income: incomeSum,
      outcome: outcomeSum,
      total: incomeSum - outcomeSum,
    };
  }
}

export default TransactionsRepository;
