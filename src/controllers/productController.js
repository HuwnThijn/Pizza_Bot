const Product = require('../models/Product');

// Lấy tất cả sản phẩm
const getAllProducts = async () => {
  try {
    const products = await Product.find({ available: true });
    return { success: true, products };
  } catch (error) {
    console.error('Lỗi khi lấy sản phẩm:', error);
    return { success: false, message: error.message };
  }
};

// Lấy sản phẩm theo danh mục
const getProductsByCategory = async (category) => {
  try {
    const products = await Product.find({ category, available: true });
    return { success: true, products };
  } catch (error) {
    console.error('Lỗi khi lấy sản phẩm theo danh mục:', error);
    return { success: false, message: error.message };
  }
};

// Lấy sản phẩm theo ID
const getProductById = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return { success: false, message: 'Không tìm thấy sản phẩm' };
    }
    return { success: true, product };
  } catch (error) {
    console.error('Lỗi khi lấy sản phẩm theo ID:', error);
    return { success: false, message: error.message };
  }
};

// Tìm kiếm sản phẩm theo tên
const searchProducts = async (query) => {
  try {
    const regex = new RegExp(query, 'i');
    const products = await Product.find({
      name: { $regex: regex },
      available: true
    });
    return { success: true, products };
  } catch (error) {
    console.error('Lỗi khi tìm kiếm sản phẩm:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  getAllProducts,
  getProductsByCategory,
  getProductById,
  searchProducts
}; 