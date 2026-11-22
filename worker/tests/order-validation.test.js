
import { describe, it, expect, vi } from 'vitest';
import {
  validateOrderItems,
  ValidationError,
} from '../src/order-validation.js';

const PRODUCT_ID = '7d3db379-43aa-42dc-8d71-01a454a1d808';
const VARIATION_ID = '95f94154-7f41-451c-aeeb-20fc6b1f184b';

function createMockClient({
  variablePricing = false,
  basePrice = '5000.00',
  variationPrice = '7500.00',
} = {}) {
  return {
    query: vi.fn(async (sql) => {
      if (sql.includes('FROM products p')) {
        return {
          rows: [{
            id: PRODUCT_ID,
            name: 'Test Bouquet',
            slug: 'test-bouquet',
            base_price: basePrice,
            has_variable_pricing: variablePricing,
            is_active: true,
            category_name: 'Bouquets',
            category_slug: 'bouquets',
          }],
        };
      }

      if (sql.includes('FROM product_variations')) {
        return {
          rows: [{
            id: VARIATION_ID,
            name: 'Large',
            size_details: 'Large bouquet',
            price: variationPrice,
          }],
        };
      }

      return { rows: [] };
    }),
  };
}

describe('Order validation and pricing', () => {
  it('rejects an empty order', async () => {
    const client = createMockClient();

    await expect(
      validateOrderItems(client, [])
    ).rejects.toThrow(
      'Your order must contain at least one product.'
    );
  });

  it('rejects invalid product IDs', async () => {
    const client = createMockClient();

    await expect(
      validateOrderItems(client, [{
        productId: 'invalid-id',
        quantity: 1,
      }])
    ).rejects.toThrow(ValidationError);
  });

  it('rejects invalid quantities', async () => {
    const client = createMockClient();

    await expect(
      validateOrderItems(client, [{
        productId: PRODUCT_ID,
        quantity: 0,
      }])
    ).rejects.toThrow(
      'Product quantities must be whole numbers between 1 and 100.'
    );
  });

  it('uses the base price when variation pricing is OFF', async () => {
    const client = createMockClient({
      variablePricing: false,
      basePrice: '5000.00',
      variationPrice: '7500.00',
    });

    const result = await validateOrderItems(client, [{
      productId: PRODUCT_ID,
      variationId: VARIATION_ID,
      quantity: 2,
    }]);

    expect(result.items[0].unitPrice).toBe('5000.00');
    expect(result.items[0].lineTotal).toBe('10000.00');
    expect(result.totalAmount).toBe('10000.00');
    expect(result.items[0].variationName).toBe('Large');
  });

  it('uses the selected variation price when variation pricing is ON', async () => {
    const client = createMockClient({
      variablePricing: true,
      basePrice: '5000.00',
      variationPrice: '7500.00',
    });

    const result = await validateOrderItems(client, [{
      productId: PRODUCT_ID,
      variationId: VARIATION_ID,
      quantity: 2,
    }]);

    expect(result.items[0].unitPrice).toBe('7500.00');
    expect(result.items[0].lineTotal).toBe('15000.00');
    expect(result.totalAmount).toBe('15000.00');
  });

  it('requires a variation when variation pricing is ON', async () => {
    const client = createMockClient({
      variablePricing: true,
    });

    await expect(
      validateOrderItems(client, [{
        productId: PRODUCT_ID,
        quantity: 1,
      }])
    ).rejects.toThrow(
      'Please select a variation for "Test Bouquet".'
    );
  });

  it('calculates totals correctly for multiple products', async () => {
    const client = createMockClient({
      basePrice: '2500.00',
    });

    const result = await validateOrderItems(client, [
      {
        productId: PRODUCT_ID,
        quantity: 2,
      },
      {
        productId: PRODUCT_ID,
        quantity: 3,
      },
    ]);

    expect(result.items).toHaveLength(2);
    expect(result.totalAmount).toBe('12500.00');
  });
});
