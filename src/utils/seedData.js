const mongoose = require('mongoose');
const Product = require('../models/Product');
const products = require('../data/products');

const seedDatabase = async () => {
  try {
    // Xóa tất cả sản phẩm hiện có
    await Product.deleteMany({});
    console.log('Đã xóa tất cả sản phẩm cũ');

    // Thêm sản phẩm mẫu
    await Product.insertMany(products);
    console.log('Đã thêm sản phẩm mẫu vào cơ sở dữ liệu');

    return { success: true, message: 'Khởi tạo dữ liệu thành công' };
  } catch (error) {
    console.error('Lỗi khi khởi tạo dữ liệu:', error);
    return { success: false, message: error.message };
  }
};

module.exports = { seedDatabase }; 