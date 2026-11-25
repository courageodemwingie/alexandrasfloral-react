
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createAdminOrder,
  getAdminProducts,
  getAdminProduct,
} from "../../services/api.js";
import "./CreateOrder.css";

const CHANNELS = [
  ["whatsapp", "WhatsApp"],
  ["instagram", "Instagram"],
  ["x", "X"],
  ["in_store", "In-store"],
  ["website", "Website"],
];

const PAYMENT_METHODS = [
  "Bank transfer",
  "POS",
  "Cash",
  "Card",
  "Other",
];

const today = new Date().toLocaleDateString("en-CA");

const money = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Product records come from Postgres in snake_case. These fallbacks also
// support older/camelCase API responses without losing the catalogue price.
function getBasePrice(product) {
  if (!product) return null;

  const value =
    product.base_price ??
    product.basePrice ??
    product.main_price ??
    product.mainPrice ??
    null;

  if (value === null || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasVariablePricing(product) {
  return Boolean(
    product?.has_variable_pricing ?? product?.hasVariablePricing ?? false
  );
}

function FormField({ label, required, children, className = "" }) {
  return (
    <label className={`create-order-field ${className}`}>
      <span>
        {label}
        {required && <b className="required-mark"> *</b>}
      </span>
      {children}
    </label>
  );
}

function SectionHeading({ number, title, description }) {
  return (
    <div className="create-order-section-heading">
      <span className="create-order-step">{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function CreateOrder() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);

  const [selectedVariationId, setSelectedVariationId] = useState("");
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const [items, setItems] = useState([]);

  const [customer, setCustomer] = useState({
    customerName: "",
    whatsappNumber: "",
  });

  const [orderChannel, setOrderChannel] = useState("whatsapp");

  const [delivery, setDelivery] = useState({
    deliveryCity: "",
    deliveryFee: "0",
    deliveryAddress: "",
    deliveryDate: "",
    deliveryNotes: "",
  });

  const [payment, setPayment] = useState({
    paymentAmount: "",
    paymentMethod: "Bank transfer",
    paymentReference: "",
    paymentDate: today,
    paymentNotes: "",
  });

  const [internalNotes, setInternalNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const orderTotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + Number(item.unitPrice) * item.quantity,
        0
      ),
    [items]
  );

  const deliveryFeeAmount = Number(delivery.deliveryFee || 0);
  const grandTotal = orderTotal + deliveryFeeAmount;

  const amountPaid = Number(payment.paymentAmount || 0);
  const balance = Math.max(grandTotal - amountPaid, 0);

  const selectedVariation = selectedProduct?.variations?.find(
    (variation) => variation.id === selectedVariationId
  );

  const selectedProductHasVariablePricing = hasVariablePricing(selectedProduct);
  const selectedProductBasePrice = getBasePrice(selectedProduct);

  // Use the main product price by default. A selected variation overrides it.
  const currentUnitPrice = selectedProduct
    ? selectedProductHasVariablePricing && selectedVariation
      ? Number(selectedVariation.price ?? selectedProductBasePrice ?? 0)
      : Number(selectedProductBasePrice ?? 0)
    : 0;

  const canAddProduct =
    selectedProduct &&
    currentUnitPrice > 0 &&
    selectedQuantity >= 1 &&
    selectedQuantity <= 100 &&
    Number.isInteger(Number(selectedQuantity));

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoadingProducts(true);
      setProductError("");

      try {
        const result = await getAdminProducts({
          status: "published",
          limit: 100,
          search: productSearch.trim(),
        });

        if (!cancelled) {
          setProducts(result.products || []);
        }
      } catch (err) {
        if (!cancelled) {
          setProductError(err.message || "Unable to load products.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [productSearch]);

  async function handleProductSelect(productId) {
    setSelectedProductId(productId);
    setSelectedProduct(null);
    setSelectedVariationId("");
    setSelectedOptions({});
    setProductError("");

    if (!productId) return;

    setLoadingProductDetails(true);

    try {
      const result = await getAdminProduct(productId);
      const detailProduct = result?.product;

      if (!detailProduct) {
        throw new Error("Product details were not returned by the server.");
      }

      // Keep the price from the catalogue list if the detail endpoint omits it.
      const listedProduct = products.find(
        (product) => String(product.id) === String(productId)
      );
      const product = {
        ...listedProduct,
        ...detailProduct,
        base_price:
          getBasePrice(detailProduct) ?? getBasePrice(listedProduct),
      };

      setSelectedProduct(product);

    } catch (err) {
      setProductError(
        err.message || "Unable to load product details."
      );
      setSelectedProductId("");
    } finally {
      setLoadingProductDetails(false);
    }
  }

  function updateOption(optionId, valueId) {
    setSelectedOptions((current) => ({
      ...current,
      [optionId]: valueId,
    }));
  }

  function addProduct() {
    if (!canAddProduct) return;

    const variation = selectedProductHasVariablePricing
      ? selectedVariation
      : null;

    const options = (selectedProduct.options || [])
      .filter((option) => option.is_active)
      .map((option) => {
        const valueId = selectedOptions[option.id];

        const value = (option.values || []).find(
          (optionValue) =>
            optionValue.id === valueId && optionValue.is_active
        );

        return value
          ? {
              optionId: option.id,
              optionName: option.name,
              valueId: value.id,
              valueName: value.name,
            }
          : null;
      })
      .filter(Boolean);

    setItems((current) => [
      ...current,
      {
        lineId: `${Date.now()}-${Math.random()}`,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        variationId: variation?.id || null,
        variationName: variation?.name || null,
        sizeDetails: variation?.size_details || null,
        selectedOptions: options,
        quantity: Number(selectedQuantity),
        unitPrice: currentUnitPrice,
      },
    ]);

    setSelectedProductId("");
    setSelectedProduct(null);
    setSelectedVariationId("");
    setSelectedOptions({});
    setSelectedQuantity(1);
  }

  function updateQuantity(lineId, quantity) {
    const parsed = Number(quantity);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.lineId === lineId
          ? { ...item, quantity: parsed }
          : item
      )
    );
  }

  function removeItem(lineId) {
    setItems((current) =>
      current.filter((item) => item.lineId !== lineId)
    );
  }

  function updateCustomer(name, value) {
    setCustomer((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateDelivery(name, value) {
    setDelivery((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updatePayment(name, value) {
    setPayment((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!items.length) {
      setError("Please add at least one product to this order.");
      return;
    }

    if (!customer.customerName.trim()) {
      setError("Please enter the customer's name.");
      return;
    }

    if (!customer.whatsappNumber.trim()) {
      setError("Please enter the customer's WhatsApp number.");
      return;
    }

    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      setError("An initial payment greater than zero is required.");
      return;
    }

    if (!Number.isFinite(deliveryFeeAmount) || deliveryFeeAmount < 0) {
      setError("Please enter a valid delivery fee.");
      return;
    }

    if (amountPaid > grandTotal) {
      setError("The initial payment cannot exceed the order total.");
      return;
    }

    if (!payment.paymentMethod) {
      setError("Please select a payment method.");
      return;
    }

    const orderData = {
      customerName: customer.customerName.trim(),
      whatsappNumber: customer.whatsappNumber.trim(),

      orderSource: orderChannel,
      orderChannel,

      deliveryCity: delivery.deliveryCity.trim() || null,
      deliveryFee: deliveryFeeAmount.toFixed(2),
      deliveryAddress: delivery.deliveryAddress.trim() || null,
      deliveryDate: delivery.deliveryDate || null,
      deliveryNotes: delivery.deliveryNotes.trim() || null,

      internalNotes: internalNotes.trim() || null,

      paymentAmount: payment.paymentAmount,
      paymentMethod: payment.paymentMethod,
      paymentReference: payment.paymentReference.trim() || null,
      paymentDate: payment.paymentDate || null,
      paymentNotes: payment.paymentNotes.trim() || null,

      items: items.map((item) => ({
        productId: item.productId,
        variationId: item.variationId,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions.map((option) => ({
          optionId: option.optionId,
          valueId: option.valueId,
        })),
      })),
    };

    setSubmitting(true);

    try {
      const result = await createAdminOrder(orderData);

      if (!result.order?.id) {
        throw new Error(
          "The order was created, but its details could not be retrieved. Please check the Orders page before trying again."
        );
      }

      navigate(`/admin/orders/${result.order.id}`, {
        replace: true,
      });
    } catch (err) {
      setError(err.message || "Unable to create this order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="create-order-page">
      <Link to="/admin/orders" className="create-order-back">
        ← Back to orders
      </Link>

      <header className="create-order-header">
        <div>
          <span className="create-order-eyebrow">
            ORDER MANAGEMENT
          </span>
          <h1>Create an order</h1>
          <p>
            Record a customer order, add products and capture the
            initial payment.
          </p>
        </div>
      </header>

      {error && (
        <div className="create-order-error" role="alert">
          {error}
        </div>
      )}

      <form className="create-order-form" onSubmit={handleSubmit}>
        <div className="create-order-main">

          {/* Customer information */}
          <section className="create-order-section">
            <SectionHeading
              number="01"
              title="Customer information"
              description="Enter the customer's contact details."
            />

            <div className="create-order-grid">
              <FormField label="Customer name" required>
                <input
                  type="text"
                  value={customer.customerName}
                  onChange={(event) =>
                    updateCustomer("customerName", event.target.value)
                  }
                  placeholder="Enter customer's full name"
                  maxLength={150}
                  required
                />
              </FormField>

              <FormField label="WhatsApp number" required>
                <input
                  type="tel"
                  value={customer.whatsappNumber}
                  onChange={(event) =>
                    updateCustomer("whatsappNumber", event.target.value)
                  }
                  placeholder="e.g. 08012345678"
                  required
                />
              </FormField>

              <FormField label="Sales channel" required>
                <select
                  value={orderChannel}
                  onChange={(event) =>
                    setOrderChannel(event.target.value)
                  }
                  required
                >
                  {CHANNELS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </section>

          {/* Product selection */}
          <section className="create-order-section">
            <SectionHeading
              number="02"
              title="Add products"
              description="Select products from your active catalogue."
            />

            <div className="create-order-product-picker">
              <FormField label="Search products">
                <input
                  type="search"
                  value={productSearch}
                  onChange={(event) =>
                    setProductSearch(event.target.value)
                  }
                  placeholder="Search by product name..."
                />
              </FormField>

              <FormField label="Select a product">
                <select
                  value={selectedProductId}
                  onChange={(event) =>
                    handleProductSelect(event.target.value)
                  }
                >
                  <option value="">Choose a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                      {getBasePrice(product) !== null
                        ? ` — ${money(getBasePrice(product))}`
                        : ""}
                    </option>
                  ))}
                </select>
              </FormField>

              {loadingProducts && (
                <p className="create-order-hint">
                  Loading products...
                </p>
              )}

              {productError && (
                <p className="create-order-inline-error">
                  {productError}
                </p>
              )}

              {!loadingProducts &&
                !productError &&
                products.length === 0 && (
                  <p className="create-order-hint">
                    No published products found.
                  </p>
                )}

              {loadingProductDetails && (
                <p className="create-order-hint">
                  Loading product details...
                </p>
              )}

              {selectedProduct && (
                <div className="create-order-product-config">
                  <div className="create-order-product-info">
                    <strong>{selectedProduct.name}</strong>
                    <span>
                      {selectedProduct.category_name || "Product"}
                    </span>
                    <span>
                      Main product price: {selectedProductBasePrice !== null
                        ? money(selectedProductBasePrice)
                        : "Not set"}
                    </span>
                    {selectedProductHasVariablePricing && (
                      <span>
                        The main product price applies unless you select a variation.
                      </span>
                    )}
                  </div>

                  {selectedProductHasVariablePricing && (
                    <FormField label="Product variation">
                      <select
                        value={selectedVariationId}
                        onChange={(event) =>
                          setSelectedVariationId(event.target.value)
                        }
                      >
                        <option value="">
                          Use main product price
                        </option>
                        {(selectedProduct.variations || [])
                          .filter((variation) => variation.is_active)
                          .map((variation) => (
                            <option
                              key={variation.id}
                              value={variation.id}
                            >
                              {variation.name}
                              {variation.size_details
                                ? ` – ${variation.size_details}`
                                : ""}
                              {" — "}
                              {money(variation.price)}
                            </option>
                          ))}
                      </select>
                    </FormField>
                  )}

                  {(selectedProduct.options || [])
                    .filter((option) => option.is_active)
                    .map((option) => (
                      <FormField
                        key={option.id}
                        label={option.name}
                      >
                        <select
                          value={selectedOptions[option.id] || ""}
                          onChange={(event) =>
                            updateOption(option.id, event.target.value)
                          }
                        >
                          <option value="">
                            No selection
                          </option>
                          {(option.values || [])
                            .filter((value) => value.is_active)
                            .map((value) => (
                              <option key={value.id} value={value.id}>
                                {value.name}
                              </option>
                            ))}
                        </select>
                      </FormField>
                    ))}

                  <div className="create-order-product-add-row">
                    <FormField label="Quantity">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={selectedQuantity}
                        onChange={(event) =>
                          setSelectedQuantity(event.target.value)
                        }
                      />
                    </FormField>

                    <div className="create-order-product-price">
                      <span>Unit price</span>
                      <strong>{
                        currentUnitPrice > 0
                          ? money(currentUnitPrice)
                          : "Price not set"
                      }</strong>
                    </div>

                    <button
                      type="button"
                      className="create-order-add-button"
                      disabled={!canAddProduct}
                      onClick={addProduct}
                    >
                      + Add product
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="create-order-added-items">
              <div className="create-order-items-heading">
                <h3>Order items</h3>
                <span>{items.length} item(s)</span>
              </div>

              {items.length === 0 ? (
                <div className="create-order-empty-items">
                  No products have been added yet.
                </div>
              ) : (
                <div className="create-order-items-list">
                  {items.map((item) => (
                    <article
                      className="create-order-item"
                      key={item.lineId}
                    >
                      <div className="create-order-item-info">
                        <strong>{item.productName}</strong>

                        {item.variationName && (
                          <span>
                            {item.variationName}
                            {item.sizeDetails
                              ? ` · ${item.sizeDetails}`
                              : ""}
                          </span>
                        )}

                        {item.selectedOptions.map((option) => (
                          <span key={option.optionId}>
                            {option.optionName}: {option.valueName}
                          </span>
                        ))}

                        <small>
                          {money(item.unitPrice)} each
                        </small>
                      </div>

                      <div className="create-order-item-quantity">
                        <label>
                          <span>Qty</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={item.quantity}
                            onChange={(event) =>
                              updateQuantity(
                                item.lineId,
                                event.target.value
                              )
                            }
                          />
                        </label>
                      </div>

                      <strong className="create-order-item-total">
                        {money(item.unitPrice * item.quantity)}
                      </strong>

                      <button
                        type="button"
                        className="create-order-remove-button"
                        onClick={() => removeItem(item.lineId)}
                        aria-label={`Remove ${item.productName}`}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Delivery information */}
          <section className="create-order-section">
            <SectionHeading
              number="03"
              title="Delivery information"
              description="Add the delivery destination and instructions."
            />

            <div className="create-order-grid">
              <FormField label="Delivery city">
                <input
                  type="text"
                  value={delivery.deliveryCity}
                  onChange={(event) =>
                    updateDelivery("deliveryCity", event.target.value)
                  }
                  placeholder="e.g. Ibadan"
                  maxLength={100}
                />
              </FormField>

              <FormField label="Delivery date">
                <input
                  type="date"
                  value={delivery.deliveryDate}
                  onChange={(event) =>
                    updateDelivery("deliveryDate", event.target.value)
                  }
                />
              </FormField>

              <FormField label="Delivery fee (₦)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={delivery.deliveryFee}
                  onChange={(event) =>
                    updateDelivery("deliveryFee", event.target.value)
                  }
                  placeholder="0.00"
                />
              </FormField>

              <FormField
                label="Delivery address"
                className="create-order-full-width"
              >
                <textarea
                  rows="3"
                  value={delivery.deliveryAddress}
                  onChange={(event) =>
                    updateDelivery("deliveryAddress", event.target.value)
                  }
                  placeholder="Enter the complete delivery address"
                  maxLength={1000}
                />
              </FormField>

              <FormField
                label="Delivery notes"
                className="create-order-full-width"
              >
                <textarea
                  rows="3"
                  value={delivery.deliveryNotes}
                  onChange={(event) =>
                    updateDelivery("deliveryNotes", event.target.value)
                  }
                  placeholder="Special delivery instructions..."
                  maxLength={1000}
                />
              </FormField>
            </div>
          </section>

          {/* Initial payment */}
          <section className="create-order-section">
            <SectionHeading
              number="04"
              title="Initial payment"
              description="Record the payment already received from the customer."
            />

            <div className="create-order-grid">
              <FormField label="Amount received (₦)" required>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payment.paymentAmount}
                  onChange={(event) =>
                    updatePayment("paymentAmount", event.target.value)
                  }
                  placeholder="Enter amount received"
                  required
                />
              </FormField>

              <FormField label="Payment method" required>
                <select
                  value={payment.paymentMethod}
                  onChange={(event) =>
                    updatePayment("paymentMethod", event.target.value)
                  }
                  required
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Payment reference">
                <input
                  type="text"
                  value={payment.paymentReference}
                  onChange={(event) =>
                    updatePayment("paymentReference", event.target.value)
                  }
                  placeholder="Transaction reference (if applicable)"
                  maxLength={150}
                />
              </FormField>

              <FormField label="Payment date">
                <input
                  type="date"
                  value={payment.paymentDate}
                  onChange={(event) =>
                    updatePayment("paymentDate", event.target.value)
                  }
                />
              </FormField>

              <FormField
                label="Payment notes"
                className="create-order-full-width"
              >
                <textarea
                  rows="2"
                  value={payment.paymentNotes}
                  onChange={(event) =>
                    updatePayment("paymentNotes", event.target.value)
                  }
                  placeholder="Additional payment information..."
                  maxLength={1000}
                />
              </FormField>
            </div>
          </section>

          {/* Internal notes */}
          <section className="create-order-section">
            <SectionHeading
              number="05"
              title="Internal notes"
              description="These notes are for your team and are not customer-facing."
            />

            <FormField label="Notes">
              <textarea
                rows="4"
                value={internalNotes}
                onChange={(event) => setInternalNotes(event.target.value)}
                placeholder="Add any internal information about this order..."
                maxLength={3000}
              />
            </FormField>
          </section>
        </div>

        {/* Order summary */}
        <aside className="create-order-summary">
          <div className="create-order-summary-inner">
            <span className="create-order-summary-eyebrow">
              ORDER SUMMARY
            </span>

            <h2>Order total</h2>

            <div className="create-order-summary-line">
              <span>Products</span>
              <strong>{items.length}</strong>
            </div>

            <div className="create-order-summary-line">
              <span>Subtotal</span>
              <strong>{money(orderTotal)}</strong>
            </div>

            <div className="create-order-summary-line">
              <span>Delivery fee</span>
              <strong>{money(deliveryFeeAmount)}</strong>
            </div>

            <div className="create-order-summary-divider" />

            <div className="create-order-summary-line">
              <span>Amount paid</span>
              <strong>{money(amountPaid)}</strong>
            </div>

            <div className="create-order-summary-line">
              <span>Outstanding balance</span>
              <strong>{money(balance)}</strong>
            </div>

            <div className="create-order-grand-total">
              <span>Total order value</span>
              <strong>{money(grandTotal)}</strong>
            </div>

            {grandTotal > 0 && amountPaid > 0 && (
              <div className="create-order-payment-status">
                {balance === 0 ? "Fully paid" : "Deposit paid"}
              </div>
            )}

            <p className="create-order-summary-note">
              An initial payment is required before an official order
              can be created.
            </p>

            <button
              type="submit"
              className="create-order-submit"
              disabled={submitting || items.length === 0}
            >
              {submitting ? "Creating order..." : "Create official order"}
            </button>

            <Link
              to="/admin/orders"
              className="create-order-cancel"
            >
              Cancel
            </Link>
          </div>
        </aside>
      </form>
    </div>
  );
}
