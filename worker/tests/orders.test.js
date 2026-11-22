
import { describe, it, expect, vi } from 'vitest';
import {
  createCartOrder,
  createDirectEnquiry,
} from '../src/orders.js';

const PRODUCT_ID = '7d3db379-43aa-42dc-8d71-01a454a1d808';
const VARIATION_ID = '95f94154-7f41-451c-aeeb-20fc6b1f184b';
const ORDER_ID = '19283924-19bc-4b57-acc7-2feed768390f';

function getNigeriaDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function createMockClient({ failOrderItem = false } = {}) {
  let itemInsertCount = 0;

  return {
    query: vi.fn(async (sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }

      if (sql.includes('FROM products p')) {
        return {
          rows: [{
            id: PRODUCT_ID,
            name: 'Test Bouquet',
            slug: 'test-bouquet',
            base_price: '5000.00',
            has_variable_pricing: false,
            is_active: true,
            category_name: 'Bouquets',
            category_slug: 'bouquets',
          }],
        };
      }

      if (sql.includes('INSERT INTO customers')) {
        return { rows: [{ id: ORDER_ID }] };
      }

      if (sql.includes('INSERT INTO orders')) {
        return {
          rows: [{
            id: ORDER_ID,
            order_number: 'AF-TEST1234',
            status: 'new',
            total_amount: '10000.00',
            currency: 'NGN',
            delivery_date: getNigeriaDate(),
            created_at: new Date().toISOString(),
          }],
        };
      }

      if (sql.includes('INSERT INTO order_items')) {
        itemInsertCount++;

        if (failOrderItem) {
          throw new Error('Simulated order item failure');
        }

        return { rows: [] };
      }

      return { rows: [] };
    }),
  };
}

describe('Order creation', () => {
  it('creates a cart order successfully', async () => {
    const client = createMockClient();

    const result = await createCartOrder(client, {
      customerName: 'Test Customer',
      whatsappNumber: '+2348012345678',
      deliveryAddress: 'Test Address, Ibadan',
      deliveryDate: getNigeriaDate(),
      items: [{
        productId: PRODUCT_ID,
        quantity: 2,
      }],
    });

    expect(result.success).toBe(true);
    expect(result.order.source).toBe('cart');
    expect(result.order.totalAmount).toBe('10000.00');
    expect(result.order.items).toHaveLength(1);

    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('rejects past delivery dates without starting a transaction', async () => {
    const client = createMockClient();

    await expect(
      createCartOrder(client, {
        customerName: 'Test Customer',
        whatsappNumber: '+2348012345678',
        deliveryAddress: 'Test Address',
        deliveryDate: '2020-01-01',
        items: [{
          productId: PRODUCT_ID,
          quantity: 1,
        }],
      })
    ).rejects.toThrow('The delivery date cannot be in the past.');

    expect(client.query).not.toHaveBeenCalled();
  });

  it('rolls back a cart order if saving an item fails', async () => {
    const client = createMockClient({ failOrderItem: true });

    await expect(
      createCartOrder(client, {
        customerName: 'Test Customer',
        whatsappNumber: '+2348012345678',
        deliveryAddress: 'Test Address',
        deliveryDate: getNigeriaDate(),
        items: [{
          productId: PRODUCT_ID,
          quantity: 1,
        }],
      })
    ).rejects.toThrow('Simulated order item failure');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
  });

  it('creates a direct product enquiry successfully', async () => {
    const client = createMockClient();

    const result = await createDirectEnquiry(client, {
      productId: PRODUCT_ID,
      quantity: 1,
    });

    expect(result.success).toBe(true);
    expect(result.enquiry.source).toBe('direct_enquiry');
    expect(result.enquiry.product.name).toBe('Test Bouquet');

    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('rolls back an enquiry if saving its item fails', async () => {
    const client = createMockClient({ failOrderItem: true });

    await expect(
      createDirectEnquiry(client, {
        productId: PRODUCT_ID,
        quantity: 1,
      })
    ).rejects.toThrow('Simulated order item failure');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
  });
});
