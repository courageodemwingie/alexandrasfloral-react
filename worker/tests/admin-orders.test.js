
import { describe, it, expect, vi } from 'vitest';
import {
  updateAdminOrder,
} from '../src/admin-orders.js';

const ORDER_ID = '7d3db379-43aa-42dc-8d71-01a454a1d808';

function createMockClient({ existingOrder = true } = {}) {
  return {
    query: vi.fn(async (sql) => {
      if (sql.includes('SELECT') && sql.includes('FROM orders')) {
        return {
          rows: existingOrder
            ? [{
                id: ORDER_ID,
                customer_id: null,
                customer_name: null,
                whatsapp_number: null,
              }]
            : [],
        };
      }

      if (sql.includes('UPDATE orders')) {
        return { rows: [{ id: ORDER_ID, status: 'paid' }] };
      }

      if (sql.includes('INSERT INTO customers')) {
        return { rows: [{ id: ORDER_ID }] };
      }

      return { rows: [] };
    }),
  };
}

describe('Admin order update validation', () => {
  it('rejects invalid order IDs', async () => {
    const client = createMockClient();

    await expect(
      updateAdminOrder(client, 'invalid-id', { status: 'paid' })
    ).rejects.toThrow('Invalid order ID.');

    expect(client.query).not.toHaveBeenCalled();
  });

  it('rejects unsupported update fields', async () => {
    const client = createMockClient();

    await expect(
      updateAdminOrder(client, ORDER_ID, { totalAmount: 500000 })
    ).rejects.toThrow('Unsupported update field: totalAmount.');
    
    expect(client.query).not.toHaveBeenCalled();
  });

  it('rejects invalid order statuses', async () => {
    const client = createMockClient();

    await expect(
      updateAdminOrder(client, ORDER_ID, { status: 'refunded' })
    ).rejects.toThrow('Invalid order status.');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('rejects empty update requests', async () => {
    const client = createMockClient();

    await expect(
      updateAdminOrder(client, ORDER_ID, {})
    ).rejects.toThrow('No supported order changes were provided.');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('rejects invalid WhatsApp numbers', async () => {
    const client = createMockClient();

    await expect(
      updateAdminOrder(client, ORDER_ID, {
        whatsappNumber: 'not-a-phone-number',
      })
    ).rejects.toThrow('Please provide a valid WhatsApp number.');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('rejects invalid delivery dates', async () => {
    const client = createMockClient();

    await expect(
      updateAdminOrder(client, ORDER_ID, {
        deliveryDate: '2026-02-30',
      })
    ).rejects.toThrow('Please provide a valid delivery date.');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('returns null when the order does not exist', async () => {
    const client = createMockClient({ existingOrder: false });

    const result = await updateAdminOrder(
      client,
      ORDER_ID,
      { status: 'paid' }
    );

    expect(result).toBeNull();
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
