import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TransactionForm from '../TransactionForm';
import { ApiError } from '../../api/client';
import { todayInput } from '../../utils/format';
import { accounts, categories, transactions } from '../../test/fixtures';

const renderForm = (props = {}) => {
  const onSubmit = props.onSubmit || vi.fn().mockResolvedValue();
  render(<TransactionForm accounts={accounts} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} {...props} />);
  return { onSubmit };
};

const optionNames = (select) => within(select).getAllByRole('option').map((o) => o.textContent.trim());

describe('TransactionForm (add)', () => {
  it("defaults the date to today and the account to the user's first account", () => {
    renderForm();
    expect(screen.getByLabelText('Date')).toHaveValue(todayInput());
    expect(screen.getByLabelText('Account')).toHaveValue('a1');
    expect(screen.getByRole('button', { name: 'Expense' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows categories for the selected type', async () => {
    renderForm();
    const select = screen.getByLabelText('Category');
    expect(optionNames(select)).toEqual(['Select a category', '🍔 Food', '🏠 Rent', '📦 Other']);

    await userEvent.click(screen.getByRole('button', { name: 'Income' }));
    expect(optionNames(screen.getByLabelText('Category'))).toEqual(['Select a category', '💼 Salary', '💰 Other']);
  });

  it('validates required fields before submitting', async () => {
    const { onSubmit } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(screen.getByText('Enter an amount greater than 0')).toBeInTheDocument();
    expect(screen.getByText('Choose a category')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a recurring expense with numeric amount and frequency', async () => {
    const { onSubmit } = renderForm();

    await userEvent.type(screen.getByLabelText('Amount'), '1200');
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Rent');
    await userEvent.selectOptions(screen.getByLabelText('Account'), 'a2');
    await userEvent.type(screen.getByLabelText('Note'), '  Apartment rent ');
    expect(screen.queryByLabelText('Frequency')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Repeat this transaction'));
    await userEvent.selectOptions(screen.getByLabelText('Frequency'), 'monthly');
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(onSubmit).toHaveBeenCalledWith(
      {
        type: 'expense',
        amount: 1200,
        category: 'Rent',
        account: 'a2',
        date: todayInput(),
        note: 'Apartment rent',
        isRecurring: true,
        frequency: 'monthly',
      },
      { file: null, removeAttachment: false }
    );
  });

  it('shows field errors returned by the API', async () => {
    const error = new ApiError('Validation failed', 400, 'VALIDATION_ERROR', [
      { field: 'account', message: 'Choose one of your accounts' },
    ]);
    renderForm({ onSubmit: vi.fn().mockRejectedValue(error) });

    await userEvent.type(screen.getByLabelText('Amount'), '10');
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Food');
    await userEvent.click(screen.getByRole('button', { name: 'Add transaction' }));

    expect(await screen.findByText('Choose one of your accounts')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Validation failed');
  });
});

describe('TransactionForm (edit)', () => {
  it('pre-fills the existing transaction', () => {
    renderForm({ transaction: transactions[1] });
    expect(screen.getByLabelText('Amount')).toHaveValue(2500);
    expect(screen.getByLabelText('Category')).toHaveValue('Salary');
    expect(screen.getByLabelText('Date')).toHaveValue('2026-07-02');
    expect(screen.getByLabelText('Repeat this transaction')).toBeChecked();
    expect(screen.getByText(/payslip\.pdf/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });
});
