import { api, request } from '../api/client';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import Modal from './Modal';
import TransactionForm from './TransactionForm';
import { Spinner } from './States';

/** Modal that creates or edits a transaction (and its attachment) via the API. */
export default function TransactionEditor({ transaction }) {
  const { accounts, categories, loading, closeTransactionForm, notifyChange } = useAppData();
  const toast = useToast();

  async function handleSubmit(values, { file, removeAttachment }) {
    const res = transaction
      ? await api.patch(`/transactions/${transaction._id}`, values)
      : await api.post('/transactions', values);
    const id = res.data._id;

    try {
      if (file) {
        const form = new FormData();
        form.append('file', file);
        await request(`/transactions/${id}/attachment`, { method: 'POST', body: form });
      } else if (removeAttachment) {
        await api.del(`/transactions/${id}/attachment`);
      }
    } catch (err) {
      toast.error(`Transaction saved, but the attachment failed: ${err.message}`);
    }

    toast.success(transaction ? 'Transaction updated' : 'Transaction added');
    notifyChange();
    closeTransactionForm();
  }

  return (
    <Modal title={transaction ? 'Edit transaction' : 'Add transaction'} onClose={closeTransactionForm}>
      {loading && !accounts.length ? (
        <Spinner />
      ) : (
        <TransactionForm
          transaction={transaction}
          accounts={accounts}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={closeTransactionForm}
        />
      )}
    </Modal>
  );
}
