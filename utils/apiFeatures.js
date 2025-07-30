const Brand = require('../models/brandModel');
const Category = require('../models/categoryModel');

class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    async filter() {
        const queryObj = { ...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'fields', 'search', 'colors'];
        excludedFields.forEach(el => delete queryObj[el]);

        // Handle brand name-to-ID conversion
        if (queryObj.brand) {
            const brand = await Brand.findOne({ name: { $regex: `^${queryObj.brand}$`, $options: 'i' } });
            queryObj.brand = brand ? brand._id : null;
        }

        // Handle category name-to-ID conversion
        if (queryObj.category) {
            const category = await Category.findOne({ name: { $regex: `^${queryObj.category}$`, $options: 'i' } });
            queryObj.category = category ? category._id : null;
        }

        // Advanced filtering
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
        this.query = this.query.find(JSON.parse(queryStr));

        // Color filtering
        if (this.queryString.colors) {
            const colors = this.queryString.colors.split(',').map(c => c.trim());
            this.query = this.query.find({
                'colors.name': { $in: colors.map(c => new RegExp(`^${c}$`, 'i')) }
            });
        }

        return this;
    }

    search() {
        if (this.queryString.search) {
            const searchRegex = new RegExp(this.queryString.search, 'i');
            this.query = this.query.find({
                $or: [
                    { name: searchRegex },
                    { description: searchRegex }
                ]
            });
        }
        return this;
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt');
        }
        return this;
    }

    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select('-__v');
        }
        return this;
    }

    paginate() {
        const page = parseInt(this.queryString.page, 10) || 1;
        const limit = parseInt(this.queryString.limit, 10) || 10;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}

module.exports = APIFeatures;
