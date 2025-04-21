const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/userModel');
const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Get all users with pagination and filtering
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Create index on role and createdAt fields
    // db.users.createIndex({ role: 1, createdAt: -1 })
    const users = await User
        .find()
        .select('-password')
        .sort('-createdAt')
        .skip(startIndex)
        .limit(limit)
        .lean(); // Use lean() for better performance when you don't need Mongoose documents

    const total = await User.countDocuments();

    res.status(200).json({
        success: true,
        count: users.length,
        total,
        pagination: {
            page,
            pages: Math.ceil(total / limit)
        },
        data: users
    });
});

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = asyncHandler(async (req, res) => {
    // Use Promise.all for parallel execution
    const [userStats, orderStats, productStats] = await Promise.all([
        // User statistics with $match early in pipeline
        User.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(new Date().setDate(new Date().getDate() - 30))
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    newUsers: {
                        $sum: {
                            $cond: [
                                { 
                                    $gte: [
                                        "$createdAt",
                                        new Date(new Date().setDate(new Date().getDate() - 7))
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]).allowDiskUse(true),

        // Order statistics with pre-calculated fields
        Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(new Date().setDate(new Date().getDate() - 30))
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$totalPrice" },
                    averageOrderValue: { $avg: "$totalPrice" }
                }
            }
        ]).allowDiskUse(true),

        // Product statistics with efficient $lookup
        Product.aggregate([
            {
                $facet: {
                    "productStats": [
                        {
                            $group: {
                                _id: null,
                                totalProducts: { $sum: 1 },
                                averagePrice: { $avg: "$price" },
                                lowStock: {
                                    $sum: {
                                        $cond: [{ $lt: ["$stockQuantity", 10] }, 1, 0]
                                    }
                                }
                            }
                        }
                    ],
                    "categoryStats": [
                        {
                            $group: {
                                _id: "$category",
                                count: { $sum: 1 }
                            }
                        },
                        {
                            $limit: 5
                        }
                    ]
                }
            }
        ]).allowDiskUse(true)
    ]);

    res.status(200).json({
        success: true,
        data: {
            users: userStats[0] || { totalUsers: 0, newUsers: 0 },
            orders: orderStats[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 },
            products: productStats[0] || { productStats: [], categoryStats: [] }
        }
    });
});

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.params.id,
        { role: req.body.role },
        { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
        throw new ErrorResponse('User not found', 404);
    }

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Get sales analytics
// @route   GET /api/admin/analytics/sales
// @access  Private/Admin
exports.getSalesAnalytics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();

    // Create index on createdAt and status fields
    // db.orders.createIndex({ createdAt: 1, status: 1 })
    const salesData = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: start, $lte: end },
                status: { $in: ['Processing', 'Shipped', 'Delivered'] }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" }
                },
                orders: { $sum: 1 },
                revenue: { $sum: "$totalPrice" }
            }
        },
        {
            $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
        }
    ]).allowDiskUse(true);

    res.status(200).json({
        success: true,
        data: salesData
    });
});

// @desc    Get inventory analytics
// @route   GET /api/admin/analytics/inventory
// @access  Private/Admin
exports.getInventoryAnalytics = asyncHandler(async (req, res) => {
    // Create index on stockQuantity field
    // db.products.createIndex({ stockQuantity: 1 })
    const inventoryData = await Product.aggregate([
        {
            $facet: {
                "lowStock": [
                    {
                        $match: { stockQuantity: { $lt: 10 } }
                    },
                    {
                        $project: {
                            name: 1,
                            stockQuantity: 1,
                            price: 1
                        }
                    }
                ],
                "categoryStock": [
                    {
                        $group: {
                            _id: "$category",
                            totalStock: { $sum: "$stockQuantity" },
                            averagePrice: { $avg: "$price" }
                        }
                    }
                ],
                "stockValue": [
                    {
                        $group: {
                            _id: null,
                            totalValue: {
                                $sum: { $multiply: ["$price", "$stockQuantity"] }
                            }
                        }
                    }
                ]
            }
        }
    ]).allowDiskUse(true);

    res.status(200).json({
        success: true,
        data: inventoryData[0]
    });
}); 