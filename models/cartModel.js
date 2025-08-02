const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variant: {
          label: String,
          price: Number,
          dimensions: {
            width: Number,
            length: Number,
            unit: {
              type: String,
              enum: ["cm", "m", "in", "ft"],
            },
          },
        },
        color: {
          name: String,
          code: String,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    totalItems: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Populate product details when finding cart
cartSchema.pre(/^find/, function (next) {
  this.populate({
    path: "items.product",
    select: "name price images variants colors",
  });
  next();
});

// Calculate totals before saving
cartSchema.pre("save", async function (next) {
  if (this.items && this.items.length > 0) {
    const Product = mongoose.model("Product");
    let total = 0;

    for (const item of this.items) {
      const product = await Product.findById(item.product);
      if (product) {
        let itemPrice = product.price;

        // Get price from variant if exists
        if (item.variant && item.variant.label) {
          const variant = product.variants.find(
            (v) => v.label === item.variant.label
          );
          if (variant && variant.price) {
            itemPrice = variant.price;
          }
        }

        total += itemPrice * item.quantity;
      }
    }

    this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
    this.totalAmount = total;
  } else {
    this.totalItems = 0;
    this.totalAmount = 0;
  }
  next();
});

// Validate stock availability
cartSchema.methods.validateStock = async function () {
  const Product = require("./Product");
  const stockErrors = [];

  for (const item of this.items) {
    const product = await Product.findById(item.product);
    if (product) {
      let availableStock = product.stock;

      // Check variant stock if variant is selected
      if (item.variant && item.variant.label) {
        const variant = product.variants.find(
          (v) => v.label === item.variant.label
        );
        if (variant) {
          availableStock = variant.stock;
        }
      }

      // Check color stock if color is selected
      if (item.color && item.color.name) {
        const color = product.colors.find((c) => c.name === item.color.name);
        if (color) {
          availableStock = color.stock;
        }
      }

      if (item.quantity > availableStock) {
        stockErrors.push({
          product: product.name,
          variant: item.variant?.label,
          color: item.color?.name,
          requested: item.quantity,
          available: availableStock,
        });
      }
    }
  }

  return stockErrors;
};

// Use mongoose.models.Cart if it exists, otherwise create a new model
module.exports = mongoose.models.Cart || mongoose.model("Cart", cartSchema);
