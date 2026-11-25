
import {
  validateOrderItems,
  ValidationError,
} from './order-validation.js';

function cleanText(value, fieldName, maxLength, required = false) {
  if (value === undefined || value === null) {
    if (required) throw new ValidationError(`${fieldName} is required.`);
    return null;
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`Invalid ${fieldName}.`);
  }

  const cleaned = value.trim();

  if (required && !cleaned) {
    throw new ValidationError(`${fieldName} is required.`);
  }

  if (cleaned.length > maxLength) {
    throw new ValidationError(`${fieldName} is too long.`);
  }

  return cleaned || null;
}

function validatePhoneNumber(value) {
  const phone = cleanText(value, 'WhatsApp number', 30, true);

  if (!/^[+0-9\s()-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7) {
    throw new ValidationError('Please provide a valid WhatsApp number.');
  }

  return phone;
}

function getNigeriaCurrentDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function validateDeliveryDate(value) {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError('Please provide a valid delivery date.');
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ValidationError('Please provide a valid delivery date.');
  }

  if (value < getNigeriaCurrentDate()) {
    throw new ValidationError('The delivery date cannot be in the past.');
  }

  return value;
}

function generateEnquiryNumber() {
  return `AF-E-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

async function createCustomer(client, name, phone, city) {
  const result = await client.query(
    `INSERT INTO customers (full_name, whatsapp_number, city, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (whatsapp_number)
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       city = COALESCE(EXCLUDED.city, customers.city),
       updated_at = NOW()
     RETURNING id`,
    [name, phone, city]
  );

  return result.rows[0].id;
}

async function saveEnquiryItems(client, enquiryId, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO enquiry_items (
         enquiry_id, product_id, variation_id, product_name,
         variation_name, selected_options, quantity, unit_price, line_total
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
      [
        enquiryId,
        item.productId,
        item.variationId,
        item.productName,
        item.variationName,
        JSON.stringify(item.selectedOptions),
        item.quantity,
        item.unitPrice,
        item.lineTotal,
      ]
    );
  }
}

export async function createCartOrder(client, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Invalid cart details.');
  }

  const customerName = cleanText(body.customerName, 'Customer name', 150, true);
  const whatsappNumber = validatePhoneNumber(body.whatsappNumber);
  const deliveryCity = cleanText(body.deliveryCity, 'Delivery city', 100);
  const deliveryAddress = cleanText(body.deliveryAddress, 'Delivery address', 1000);
  const deliveryNotes = cleanText(body.deliveryNotes, 'Delivery notes', 1000);
  const requestedDeliveryDate = validateDeliveryDate(body.deliveryDate);

  await client.query('BEGIN');

  try {
    const validated = await validateOrderItems(client, body.items);

    const customerId = await createCustomer(
      client,
      customerName,
      whatsappNumber,
      deliveryCity
    );

    const enquiryNumber = generateEnquiryNumber();

    const enquiryResult = await client.query(
      `INSERT INTO enquiries (
         enquiry_number, enquiry_type, customer_id, customer_name,
         whatsapp_number, source, status, delivery_city, delivery_address,
         delivery_notes, requested_delivery_date, estimated_total, currency
       )
       VALUES ($1, 'cart', $2, $3, $4, 'website', 'new', $5, $6, $7, $8, $9, 'NGN')
       RETURNING id, enquiry_number, status, estimated_total, currency,
                 requested_delivery_date, created_at`,
      [
        enquiryNumber,
        customerId,
        customerName,
        whatsappNumber,
        deliveryCity,
        deliveryAddress,
        deliveryNotes,
        requestedDeliveryDate,
        validated.totalAmount,
      ]
    );

    const enquiry = enquiryResult.rows[0];

    await saveEnquiryItems(client, enquiry.id, validated.items);
    await client.query('COMMIT');

    const responseEnquiry = {
      id: enquiry.id,
      reference: enquiry.enquiry_number,
      source: 'website',
      type: 'cart',
      status: enquiry.status,
      totalAmount: enquiry.estimated_total,
      currency: enquiry.currency,
      deliveryDate: enquiry.requested_delivery_date,
      createdAt: enquiry.created_at,
      items: validated.items,
    };

    return {
      success: true,
      message: 'Your cart has been received. Please continue on WhatsApp to finalise your order.',
      enquiry: responseEnquiry,
      order: responseEnquiry,
    };
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('Cart enquiry rollback failed:', rollbackError);
    });

    throw error;
  }
}

export async function createDirectEnquiry(client, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Invalid enquiry details.');
  }

  const enquiryItem = {
    productId: body.productId,
    variationId: body.variationId ?? null,
    quantity: body.quantity ?? 1,
    selectedOptions: body.selectedOptions ?? [],
  };

  await client.query('BEGIN');

  try {
    const validated = await validateOrderItems(client, [enquiryItem]);
    const enquiryNumber = generateEnquiryNumber();

    const enquiryResult = await client.query(
      `INSERT INTO enquiries (
         enquiry_number, enquiry_type, source, status, estimated_total, currency
       )
       VALUES ($1, 'direct_product', 'website', 'new', $2, 'NGN')
       RETURNING id, enquiry_number, status, estimated_total, currency, created_at`,
      [enquiryNumber, validated.totalAmount]
    );

    const enquiry = enquiryResult.rows[0];

    await saveEnquiryItems(client, enquiry.id, validated.items);
    await client.query('COMMIT');

    const item = validated.items[0];

    return {
      success: true,
      message: 'Your product enquiry has been received.',
      enquiry: {
        id: enquiry.id,
        reference: enquiry.enquiry_number,
        source: 'website',
        type: 'direct_product',
        status: enquiry.status,
        totalAmount: enquiry.estimated_total,
        currency: enquiry.currency,
        createdAt: enquiry.created_at,
        product: {
          id: item.productId,
          name: item.productName,
          slug: item.productSlug,
          variationId: item.variationId,
          variationName: item.variationName,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions,
        },
      },
    };
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('Direct enquiry rollback failed:', rollbackError);
    });

    throw error;
  }
}
