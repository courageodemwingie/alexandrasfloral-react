import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createAdminProduct,
  getAdminProduct,
  updateAdminProduct,
  uploadAdminImage,
} from "../../services/api.js";
import "./AdminProductForm.css";

const CATEGORIES = [
  { id: "7d3db379-43aa-42dc-8d71-01a454a1d808", name: "Bouquets" },
  { id: "95f94154-7f41-451c-aeeb-20fc6b1f184b", name: "Flower Arrangements" },
  { id: "19283924-19bc-4b57-acc7-2feed768390f", name: "Plants" },
  { id: "99d33b99-c9db-4fbd-8162-0d0273e42983", name: "Wreaths" },
  { id: "320a636d-0ac9-421f-a38a-e612b147307b", name: "Gifts" },
];

const emptyVariation = () => ({
  name: "",
  sizeDetails: "",
  price: "",
  imageKey: "",
  isActive: true,
});

const emptyOption = () => ({
  name: "",
  isActive: true,
  values: [{ name: "", imageKey: "", isActive: true }],
});

const initialForm = () => ({
  name: "",
  slug: "",
  description: "",
  categoryId: "",
  basePrice: "",
  hasVariablePricing: false,
  mainImageKey: "",
  featured: false,
  isActive: true,
  sortOrder: 0,
  publicationStatus: "draft",
  variations: [],
  options: [],
});

function ImageUploadField({ label, imageKey, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("");
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (!preview) return;

    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError("");

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      event.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setUploading(true);

    try {
      const result = await uploadAdminImage(file);
      onUploaded(result.imageKey);
    } catch (err) {
      setUploadError(err.message || "Image upload failed.");
      setPreview("");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="admin-form-field admin-image-upload">
      <span>{label}</span>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {preview && (
        <img
          src={preview}
          alt={`${label} preview`}
          className="admin-image-preview"
        />
      )}

      {uploading && <small>Uploading image...</small>}

      {imageKey && !uploading && (
        <small className="admin-image-upload-success">
          <span>Image uploaded successfully.</span>
          <br />
          Image key: {imageKey}
        </small>
      )}

      {uploadError && (
        <small className="admin-image-upload-error">{uploadError}</small>
      )}
    </div>
  );
}

export default function AdminProductForm() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const isEditing = Boolean(productId);

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!productId) return;

    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        const response = await getAdminProduct(productId);
        if (cancelled) return;

        const product = response.product;

        setForm({
          name: product.name || "",
          slug: product.slug || "",
          description: product.description || "",
          categoryId: product.category_id || "",
          basePrice: product.base_price ?? "",
          hasVariablePricing: product.has_variable_pricing ?? false,
          mainImageKey: product.main_image_key || "",
          featured: product.featured ?? false,
          isActive: product.is_active ?? true,
          sortOrder: product.sort_order ?? 0,
          publicationStatus: product.publication_status || "draft",
          variations: (product.variations || []).map((variation) => ({
            id: variation.id,
            name: variation.name || "",
            sizeDetails: variation.size_details || "",
            price: variation.price ?? "",
            imageKey: variation.image_key || "",
            sortOrder: variation.sort_order ?? 0,
            isActive: variation.is_active ?? true,
          })),
          options: (product.options || []).map((option) => ({
            id: option.id,
            name: option.name || "",
            sortOrder: option.sort_order ?? 0,
            isActive: option.is_active ?? true,
            values: (option.values || []).map((value) => ({
              id: value.id,
              name: value.name || "",
              imageKey: value.image_key || "",
              sortOrder: value.sort_order ?? 0,
              isActive: value.is_active ?? true,
            })),
          })),
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load this product.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateVariation(index, field, value) {
    setForm((current) => ({
      ...current,
      variations: current.variations.map((variation, i) =>
        i === index ? { ...variation, [field]: value } : variation,
      ),
    }));
  }

  function addVariation() {
    setForm((current) => ({
      ...current,
      variations: [...current.variations, emptyVariation()],
    }));
  }

  function removeVariation(index) {
    setForm((current) => ({
      ...current,
      variations: current.variations.filter((_, i) => i !== index),
    }));
  }

  function updateOption(index, field, value) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, i) =>
        i === index ? { ...option, [field]: value } : option,
      ),
    }));
  }

  function addOption() {
    setForm((current) => ({
      ...current,
      options: [...current.options, emptyOption()],
    }));
  }

  function removeOption(index) {
    setForm((current) => ({
      ...current,
      options: current.options.filter((_, i) => i !== index),
    }));
  }

  function updateOptionValue(optionIndex, valueIndex, field, value) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, i) => {
        if (i !== optionIndex) return option;

        return {
          ...option,
          values: option.values.map((item, j) =>
            j === valueIndex ? { ...item, [field]: value } : item,
          ),
        };
      }),
    }));
  }

  function addOptionValue(optionIndex) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, i) =>
        i === optionIndex
          ? {
              ...option,
              values: [
                ...option.values,
                { name: "", imageKey: "", isActive: true },
              ],
            }
          : option,
      ),
    }));
  }

  function removeOptionValue(optionIndex, valueIndex) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, i) =>
        i === optionIndex
          ? {
              ...option,
              values: option.values.filter((_, j) => j !== valueIndex),
            }
          : option,
      ),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Please enter a product name.");
      return;
    }

    if (!form.categoryId) {
      setError("Please select a product category.");
      return;
    }

    if (form.publicationStatus === "published") {
      if (!form.hasVariablePricing && form.basePrice === "") {
        setError("Enter a base price before publishing this product.");
        return;
      }

      if (
        form.hasVariablePricing &&
        !form.variations.some((variation) => variation.isActive)
      ) {
        setError("Add at least one active variation before publishing.");
        return;
      }
    }

    const payload = {
      ...form,
      basePrice: form.basePrice === "" ? null : form.basePrice,
      sortOrder: Number(form.sortOrder) || 0,
      variations: form.variations.map((variation, index) => ({
        ...variation,
        price: variation.price,
        sortOrder: Number(variation.sortOrder ?? index),
      })),
      options: form.options.map((option, index) => ({
        ...option,
        sortOrder: Number(option.sortOrder ?? index),
        values: option.values.map((value, valueIndex) => ({
          ...value,
          sortOrder: Number(value.sortOrder ?? valueIndex),
        })),
      })),
    };

    setSaving(true);

    try {
      if (isEditing) {
        await updateAdminProduct(productId, payload);
        setSuccess("Product updated successfully.");
      } else {
        await createAdminProduct(payload);
        setSuccess("Product created successfully.");
      }

      navigate("/admin/products");
    } catch (err) {
      setError(err.message || "Unable to save this product.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="admin-product-form-loading">Loading product...</div>;
  }

  return (
    <div className="admin-product-form-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-section-eyebrow">CATALOGUE</span>
          <h1>{isEditing ? "Edit product" : "Add product"}</h1>
          <p>
            {isEditing
              ? "Update your product details and catalogue settings."
              : "Add a new product to your floral catalogue."}
          </p>
        </div>

        <Link to="/admin/products" className="admin-secondary-button">
          Back to products
        </Link>
      </div>

      {error && <div className="admin-form-alert error">{error}</div>}
      {success && <div className="admin-form-alert success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <section className="admin-form-section">
          <div className="admin-form-section-heading">
            <h2>Product information</h2>
            <p>Start with the basic details customers will see.</p>
          </div>

          <div className="admin-form-grid">
            <label className="admin-form-field full-width">
              Product name *
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. The Classic Rose Bouquet"
                required
              />
            </label>

            <label className="admin-form-field full-width">
              Product URL slug
              <input
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                placeholder="Leave blank to generate from product name"
              />
            </label>

            <label className="admin-form-field full-width">
              Description
              <textarea
                rows="5"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe this product..."
              />
            </label>

            <label className="admin-form-field">
              Category *
              <select
                value={form.categoryId}
                onChange={(e) => updateField("categoryId", e.target.value)}
                required
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-form-field">
              Display order
              <input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(e) => updateField("sortOrder", e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-heading">
            <h2>Product image</h2>
            <p>Image upload will be connected to Cloudflare R2 next.</p>
          </div>
          Main image key
          <ImageUploadField
            label="Main product image"
            imageKey={form.mainImageKey}
            onUploaded={(key) => updateField("mainImageKey", key)}
          />
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-heading">
            <h2>Pricing</h2>
            <p>Choose how prices should work for this product.</p>
          </div>

          <label className="admin-toggle-row">
            <span>
              <strong>Variation Prices</strong>
              <small>
                When enabled, each variation has its own selling price. When
                disabled, all variations use the base price.
              </small>
            </span>
            <input
              type="checkbox"
              checked={form.hasVariablePricing}
              onChange={(e) =>
                updateField("hasVariablePricing", e.target.checked)
              }
            />
          </label>

          <label className="admin-form-field admin-base-price">
            Base price (₦)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.basePrice}
              onChange={(e) => updateField("basePrice", e.target.value)}
              placeholder="e.g. 25000"
            />
            <small>
              Used for every variation when Variation Prices is switched off.
            </small>
          </label>

          <div className="admin-repeatable-heading">
            <div>
              <h3>Product variations</h3>
              <p>Examples: Small, Medium, Large or 12 Roses, 24 Roses.</p>
            </div>
            <button type="button" onClick={addVariation}>
              + Add variation
            </button>
          </div>

          {form.variations.length === 0 && (
            <p className="admin-form-hint">No variations added yet.</p>
          )}

          {form.variations.map((variation, index) => (
            <div className="admin-repeatable-card" key={variation.id || index}>
              <div className="admin-repeatable-card-heading">
                <strong>Variation {index + 1}</strong>
                <button
                  type="button"
                  className="admin-remove-button"
                  onClick={() => removeVariation(index)}
                >
                  Remove
                </button>
              </div>

              <div className="admin-form-grid">
                <label className="admin-form-field">
                  Variation name *
                  <input
                    value={variation.name}
                    onChange={(e) =>
                      updateVariation(index, "name", e.target.value)
                    }
                    placeholder="e.g. Medium"
                    required
                  />
                </label>

                <label className="admin-form-field">
                  Size details
                  <input
                    value={variation.sizeDetails}
                    onChange={(e) =>
                      updateVariation(index, "sizeDetails", e.target.value)
                    }
                    placeholder="e.g. 24 stems"
                  />
                </label>

                <label className="admin-form-field">
                  Variation price (₦)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variation.price}
                    onChange={(e) =>
                      updateVariation(index, "price", e.target.value)
                    }
                    required
                  />
                </label>

                <ImageUploadField
                  label="Variation image"
                  imageKey={variation.imageKey}
                  onUploaded={(key) => updateVariation(index, "imageKey", key)}
                />
              </div>

              <label className="admin-inline-checkbox">
                <input
                  type="checkbox"
                  checked={variation.isActive}
                  onChange={(e) =>
                    updateVariation(index, "isActive", e.target.checked)
                  }
                />
                Active variation
              </label>
            </div>
          ))}
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-heading">
            <h2>Product options</h2>
            <p>
              Add selectable choices such as flower colour, wrapping colour or
              card message.
            </p>
          </div>

          <div className="admin-repeatable-heading">
            <div>
              <h3>Options</h3>
            </div>
            <button type="button" onClick={addOption}>
              + Add option
            </button>
          </div>

          {form.options.map((option, optionIndex) => (
            <div
              className="admin-repeatable-card"
              key={option.id || optionIndex}
            >
              <div className="admin-repeatable-card-heading">
                <strong>Option {optionIndex + 1}</strong>
                <button
                  type="button"
                  className="admin-remove-button"
                  onClick={() => removeOption(optionIndex)}
                >
                  Remove option
                </button>
              </div>

              <label className="admin-form-field">
                Option name *
                <input
                  value={option.name}
                  onChange={(e) =>
                    updateOption(optionIndex, "name", e.target.value)
                  }
                  placeholder="e.g. Wrapping colour"
                  required
                />
              </label>

              <div className="admin-option-values-heading">
                <strong>Selectable values</strong>
                <button
                  type="button"
                  onClick={() => addOptionValue(optionIndex)}
                >
                  + Add value
                </button>
              </div>

              {option.values.map((value, valueIndex) => (
                <div
                  className="admin-option-value"
                  key={value.id || valueIndex}
                >
                  <input
                    value={value.name}
                    onChange={(e) =>
                      updateOptionValue(
                        optionIndex,
                        valueIndex,
                        "name",
                        e.target.value,
                      )
                    }
                    placeholder="e.g. Burgundy"
                    required
                  />
                  <ImageUploadField
  label="Option image"
  imageKey={value.imageKey}
  onUploaded={(key) =>
    updateOptionValue(optionIndex, valueIndex, "imageKey", key)
  }
/>
                  <button
                    type="button"
                    className="admin-remove-button"
                    onClick={() => removeOptionValue(optionIndex, valueIndex)}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <label className="admin-inline-checkbox">
                <input
                  type="checkbox"
                  checked={option.isActive}
                  onChange={(e) =>
                    updateOption(optionIndex, "isActive", e.target.checked)
                  }
                />
                Active option
              </label>
            </div>
          ))}
        </section>

        <section className="admin-form-section">
          <div className="admin-form-section-heading">
            <h2>Publishing settings</h2>
            <p>Control how this product appears in your catalogue.</p>
          </div>

          <label className="admin-form-field">
            Publication status
            <select
              value={form.publicationStatus}
              onChange={(e) => updateField("publicationStatus", e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="admin-inline-checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => updateField("isActive", e.target.checked)}
            />
            Product is active
          </label>

          <label className="admin-inline-checkbox">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => updateField("featured", e.target.checked)}
            />
            Feature this product
          </label>
        </section>

        <div className="admin-form-actions">
          <Link to="/admin/products" className="admin-secondary-button">
            Cancel
          </Link>
          <button
            type="submit"
            className="admin-primary-button"
            disabled={saving}
          >
            {saving ? "Saving..." : isEditing ? "Save changes" : "Save product"}
          </button>
        </div>
      </form>
    </div>
  );
}
