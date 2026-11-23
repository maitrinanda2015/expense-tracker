import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TransactionList from '../TransactionList';
import TransactionFilters, { EMPTY_FILTERS } from '../TransactionFilters';
import { accounts, categories, transactions } from '../../test/fixtures';

const icon = (type, name) => categories[type].find((c) => c.name === name)?.icon;

describe('TransactionList', () => {
  it('renders each transaction with icon, category, note, date, account and signed amount', () => {
    render(<TransactionList items={transactions} currency="USD" categoryIcon={icon} />);
    const [lunch, salary] = screen.getAllByRole('listitem');

    expect(within(lunch).getByText('🍔')).toBeInTheDocument();
    expect(within(lunch).getByText('Food')).toBeInTheDocument();
    expect(within(lunch).getByText('Lunch')).toBeInTheDocument();
    expect(within(lunch).getByText('Cash')).toBeInTheDocument();
    expect(within(lunch).getByText('Expense', { selector: '.type-pill' })).toBeInTheDocument();
    expect(lunch).toHaveTextContent(/−\$25\.00/);

    expect(salary).toHaveTextContent(/\+\$2,500\.00/);
    expect(within(salary).getByText('Income', { selector: '.type-pill' })).toBeInTheDocument();
    expect(within(salary).getByText(/Monthly/, { selector: '.badge' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no transactions', () => {
    render(<TransactionList items={[]} emptyTitle="No matching transactions" emptyMessage="Try different filters." />);
    expect(screen.getByRole('heading', { name: 'No matching transactions' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('calls onEdit and onDelete with the transaction', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<TransactionList items={transactions} categoryIcon={icon} onEdit={onEdit} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit Food transaction' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Salary transaction' }));
    expect(onEdit).toHaveBeenCalledWith(transactions[0]);
    expect(onDelete).toHaveBeenCalledWith(transactions[1]);
  });
});

/** Wires the controlled filter bar to a client-side filter for the test. */
function FilteredList({ onFiltersChange }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const visible = transactions.filter(
    (t) =>
      (!filters.type || t.type === filters.type) &&
      (!filters.category || t.category === filters.category) &&
      (!filters.account || t.account._id === filters.account)
  );
  return (
    <>
      <TransactionFilters
        value={filters}
        accounts={accounts}
        categories={categories}
        onChange={(next) => {
          setFilters(next);
          onFiltersChange(next);
        }}
      />
      <TransactionList items={visible} categoryIcon={icon} emptyTitle="No matching transactions" />
    </>
  );
}

describe('TransactionFilters', () => {
  it('combines filters and emits the full filter object', async () => {
    const onFiltersChange = vi.fn();
    render(<FilteredList onFiltersChange={onFiltersChange} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);

    await userEvent.selectOptions(screen.getByLabelText('Type'), 'expense');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Lunch')).toBeInTheDocument();

    await userEvent.click(screen.getByText(/More filters/));
    await userEvent.selectOptions(screen.getByLabelText('Account'), 'a2');
    expect(screen.getByRole('heading', { name: 'No matching transactions' })).toBeInTheDocument();
    expect(onFiltersChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, type: 'expense', account: 'a2' });
  });

  it('limits category options to the selected type and clears a mismatched category', async () => {
    const onFiltersChange = vi.fn();
    render(<FilteredList onFiltersChange={onFiltersChange} />);
    await userEvent.click(screen.getByText(/More filters/));

    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Rent');
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'income');

    expect(onFiltersChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, type: 'income', category: '' });
    const options = within(screen.getByLabelText('Category')).getAllByRole('option').map((o) => o.textContent.trim());
    expect(options).toEqual(['All categories', '💼 Salary', '💰 Other']);
  });

  it('clears all filters', async () => {
    const onFiltersChange = vi.fn();
    render(<FilteredList onFiltersChange={onFiltersChange} />);

    await userEvent.type(screen.getByPlaceholderText('Search note, category or amount'), 'rent');
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'expense');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(onFiltersChange).toHaveBeenLastCalledWith(EMPTY_FILTERS);
    expect(screen.getByLabelText('Type')).toHaveValue('');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
