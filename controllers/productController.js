const Product = require('../models/Product');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { uploadImage, uploadMultipleImages, deleteImage } = require('../utils/imageHandler');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const Order = require('../models/Order');

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res) => {
    const {
        search,
        category,
        brand,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10,
        featured,
        inStock
    } = req.query;

    // Build query
    const query = { isActive: true };

    // Search by name or description
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    // Filter by category
    if (category) {
        query.category = category;
    }

    // Filter by brand
    if (brand) {
        query.brand = brand;
    }

    // Filter by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
        query.price = {};
        if (minPrice !== undefined) query.price.$gte = minPrice;
        if (maxPrice !== undefined) query.price.$lte = maxPrice;
    }

    // Filter by featured status
    if (featured !== undefined) {
        query.isFeatured = featured === 'true';
    }

    // Filter by stock status
    if (inStock !== undefined) {
        query.stock = inStock === 'true' ? { $gt: 0 } : { $lte: 0 };
    }

    // Build sort object
    const sortOptions = {};
    if (sortBy && sortOrder) {
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Product.countDocuments(query);

    // Execute query
    const products = await Product.find(query)
        .populate('brand', 'name logo')
        .populate('category', 'name')
        .sort(sortOptions)
        .skip(startIndex)
        .limit(limit);

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
        pagination.next = {
            page: page + 1,
            limit
        };
    }

    if (startIndex > 0) {
        pagination.prev = {
            page: page - 1,
            limit
        };
    }

    res.status(200).json({
        success: true,
        count: products.length,
        total,
        pagination,
        data: products
    });
});

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id)
        .populate('brand', 'name logo')
        .populate('category', 'name');

    if (!product) {
        return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: product
    });
});

// @desc    Create new product with images
// @route   POST /api/v1/products
// @access  Private/Admin
exports.createProduct = asyncHandler(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Set default values for product
        const productData = {
            ...req.body,
            isActive: true,
            isFeatured: req.body.isFeatured || false,
            soldCount: 0,
            averageRating: 0,
            reviewCount: 0
        };

        // First create the product without images
        const product = await Product.create([productData], { session });

        // Handle main product image
        if (req.file) {
            const result = await uploadImage(req.file, 'products', product[0]._id);
            product[0].mainImage = {
                public_id: result.public_id,
                url: result.secure_url
            };
        }

        // Handle additional product images
        if (req.files && req.files.length > 0) {
            const results = await uploadMultipleImages(req.files, 'products', product[0]._id);
            product[0].images = results.map(result => ({
                public_id: result.public_id,
                url: result.secure_url
            }));
        }

        // Save the product with images
        await product[0].save({ session });
        await session.commitTransaction();

        res.status(201).json({
            success: true,
            data: product[0]
        });
    } catch (error) {
        await session.abortTransaction();
        return next(error);
    } finally {
        session.endSession();
    }
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private/Admin
exports.updateProduct = asyncHandler(async (req, res, next) => {
    let product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }

    // Update featured status if provided
    if (req.body.isFeatured !== undefined) {
        product.isFeatured = req.body.isFeatured;
    }

    // Update other fields
    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: product
    });
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
    }

    // Delete main image
    if (product.mainImage && product.mainImage.public_id) {
        await deleteImage(product.mainImage.public_id);
    }

    // Delete additional images
    if (product.images && product.images.length > 0) {
        const deletePromises = product.images.map(image => 
            deleteImage(image.public_id)
        );
        await Promise.all(deletePromises);
    }

    await product.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Upload product images
// @route   POST /api/v1/products/:id/images
// @access  Private/Admin
exports.uploadProductImages = asyncHandler(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const product = await Product.findById(req.params.id).session(session);

        if (!product) {
            throw new ErrorResponse(`Product not found with id of ${req.params.id}`, 404);
        }

        // Handle main image upload
        if (req.file) {
            // Delete old main image if exists
            if (product.mainImage && product.mainImage.public_id) {
                await deleteImage(product.mainImage.public_id);
            }

            const result = await uploadImage(req.file, 'products', product._id);
            product.mainImage = {
                public_id: result.public_id,
                url: result.secure_url
            };
        }

        // Handle additional images upload
        if (req.files && req.files.length > 0) {
            // Delete old additional images if exist
            if (product.images && product.images.length > 0) {
                const deletePromises = product.images.map(image => 
                    deleteImage(image.public_id)
                );
                await Promise.all(deletePromises);
            }

            const results = await uploadMultipleImages(req.files, 'products', product._id);
            product.images = results.map(result => ({
                public_id: result.public_id,
                url: result.secure_url
            }));
        }

        await product.save({ session });
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        await session.abortTransaction();
        return next(error);
    } finally {
        session.endSession();
    }
});

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = asyncHandler(async (req, res) => {
    // Get featured products with additional sorting criteria
    const products = await Product.find({ 
        isActive: true,
        isFeatured: true,
        stock: { $gt: 0 } // Only in-stock featured products
    })
        .populate('category', 'name')
        .populate('brand', 'name')
        .sort({ 
            soldCount: -1,      // Best selling first
            averageRating: -1,  // Highly rated next
            createdAt: -1       // Latest products next
        })
        .limit(8);

    res.status(200).json({
        success: true,
        count: products.length,
        data: products
    });
});

// @desc    Get related products
// @route   GET /api/products/:id/related
// @access  Public
exports.getRelatedProducts = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        throw new ErrorResponse('Product not found', 404);
    }

    // Find products in the same category and price range
    const priceRange = {
        min: product.price * 0.7, // 30% less than product price
        max: product.price * 1.3  // 30% more than product price
    };

    // Find related products based on multiple criteria
    const relatedProducts = await Product.find({
        _id: { $ne: product._id },
        isActive: true,
        $or: [
            // Same category
            { category: product.category },
            // Similar price range and same brand
            {
                brand: product.brand,
                price: { 
                    $gte: priceRange.min,
                    $lte: priceRange.max
                }
            }
        ],
        stock: { $gt: 0 } // Only show in-stock related products
    })
        .populate('category', 'name')
        .populate('brand', 'name')
        .sort({ 
            soldCount: -1,  // Best selling first
            averageRating: -1  // Highly rated next
        })
        .limit(4);

    res.status(200).json({
        success: true,
        count: relatedProducts.length,
        data: relatedProducts
    });
});

// Helper function to get date range
const getDateRange = (period) => {
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
        case 'week':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case 'two_weeks':
            startDate.setDate(endDate.getDate() - 14);
            break;
        case 'month':
            startDate.setMonth(endDate.getMonth() - 1);
            break;
        case 'three_months':
            startDate.setMonth(endDate.getMonth() - 3);
            break;
        case 'six_months':
            startDate.setMonth(endDate.getMonth() - 6);
            break;
        default:
            startDate.setDate(endDate.getDate() - 7); // Default to week
    }

    return { startDate, endDate };
};

// Helper function to aggregate sales data
const aggregateSalesData = async (startDate, endDate, sortBy = 'quantity') => {
    const matchStage = {
        'paymentInfo.status': 'completed',
        status: { $ne: 'cancelled' },
        orderDate: {
            $gte: startDate,
            $lte: endDate
        }
    };

    const groupStage = {
        _id: '$items.product',
        productName: { $first: '$items.name' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { 
            $sum: { 
                $multiply: ['$items.price', '$items.quantity'] 
            }
        },
        orders: { $sum: 1 }
    };

    const sortStage = {};
    sortStage[sortBy === 'revenue' ? 'totalRevenue' : 'totalQuantity'] = -1;

    const salesData = await Order.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        { $group: groupStage },
        { $sort: sortStage },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'product'
            }
        },
        { $unwind: '$product' },
        {
            $project: {
                _id: 1,
                productName: '$product.name',
                totalQuantity: 1,
                totalRevenue: 1,
                orders: 1,
                averageOrderValue: { 
                    $divide: ['$totalRevenue', '$orders'] 
                }
            }
        }
    ]);

    return salesData;
};

// @desc    Get sales analytics
// @route   GET /api/products/analytics/sales
// @access  Private/Admin
exports.getSalesAnalytics = asyncHandler(async (req, res) => {
    const { period, startDate, endDate, sortBy, limit = 10 } = req.query;
    
    // Get date range
    const dateRange = startDate && endDate 
        ? { startDate: new Date(startDate), endDate: new Date(endDate) }
        : getDateRange(period);

    // Get sales data
    const salesData = await aggregateSalesData(
        dateRange.startDate,
        dateRange.endDate,
        sortBy
    );

    // Calculate total metrics
    const totals = salesData.reduce((acc, item) => ({
        totalQuantity: acc.totalQuantity + item.totalQuantity,
        totalRevenue: acc.totalRevenue + item.totalRevenue,
        totalOrders: acc.totalOrders + item.orders
    }), { totalQuantity: 0, totalRevenue: 0, totalOrders: 0 });

    res.status(200).json({
        success: true,
        dateRange: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
        },
        totals,
        count: salesData.length,
        data: salesData.slice(0, limit)
    });
});

// @desc    Download sales report as PDF
// @route   GET /api/products/analytics/sales/download
// @access  Private/Admin
exports.downloadSalesReport = asyncHandler(async (req, res) => {
    const { period, startDate, endDate, sortBy } = req.query;
    
    // Get date range
    const dateRange = startDate && endDate 
        ? { startDate: new Date(startDate), endDate: new Date(endDate) }
        : getDateRange(period);

    // Get sales data
    const salesData = await aggregateSalesData(
        dateRange.startDate,
        dateRange.endDate,
        sortBy
    );

    // Create PDF document
    const doc = new PDFDocument();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${Date.now()}.pdf`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add content to PDF
    doc
        .fontSize(20)
        .text('Sales Report', { align: 'center' })
        .moveDown();

    // Add date range
    doc
        .fontSize(12)
        .text(`Period: ${dateRange.startDate.toLocaleDateString()} to ${dateRange.endDate.toLocaleDateString()}`)
        .moveDown();

    // Add table headers
    const tableTop = 150;
    doc
        .fontSize(10)
        .text('Product', 50, tableTop)
        .text('Quantity', 200, tableTop)
        .text('Revenue', 300, tableTop)
        .text('Orders', 400, tableTop);

    // Add table rows
    let y = tableTop + 20;
    salesData.forEach((item) => {
        doc
            .text(item.productName.substring(0, 25), 50, y)
            .text(item.totalQuantity.toString(), 200, y)
            .text(`₹${item.totalRevenue.toFixed(2)}`, 300, y)
            .text(item.orders.toString(), 400, y);
        y += 20;
    });

    // Add totals
    const totals = salesData.reduce((acc, item) => ({
        totalQuantity: acc.totalQuantity + item.totalQuantity,
        totalRevenue: acc.totalRevenue + item.totalRevenue,
        totalOrders: acc.totalOrders + item.orders
    }), { totalQuantity: 0, totalRevenue: 0, totalOrders: 0 });

    doc
        .moveDown()
        .fontSize(12)
        .text('Summary', { underline: true })
        .moveDown()
        .text(`Total Quantity Sold: ${totals.totalQuantity}`)
        .text(`Total Revenue: ₹${totals.totalRevenue.toFixed(2)}`)
        .text(`Total Orders: ${totals.totalOrders}`);

    // Finalize PDF
    doc.end();
}); 