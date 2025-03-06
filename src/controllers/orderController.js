const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { clearCart } = require('./cartController');

// Tạo đơn hàng mới từ giỏ hàng
const createOrder = async (telegramId, userData, deliveryAddress, paymentMethod) => {
  try {
    // Lấy giỏ hàng hiện tại
    const cart = await Cart.findOne({ telegramId }).populate({
      path: 'items.product',
      model: 'Product'
    });

    if (!cart || cart.items.length === 0) {
      return { success: false, message: 'Giỏ hàng trống' };
    }

    // Tạo đơn hàng mới
    const order = new Order({
      user: {
        telegramId,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        username: userData.username || ''
      },
      items: cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions,
        price: item.price
      })),
      totalAmount: cart.totalAmount,
      status: 'pending',
      deliveryAddress: deliveryAddress || 'Chưa có địa chỉ',
      paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending'
    });

    await order.save();

    // Populate thông tin sản phẩm cho đơn hàng
    const populatedOrder = await Order.findById(order._id).populate({
      path: 'items.product',
      model: 'Product'
    });

    // Xóa giỏ hàng sau khi đặt hàng
    await clearCart(telegramId);

    return { success: true, order: populatedOrder };
  } catch (error) {
    console.error('Lỗi khi tạo đơn hàng:', error);
    return { success: false, message: error.message };
  }
};

// Lấy đơn hàng theo ID
const getOrderById = async (orderId) => {
  try {
    const order = await Order.findById(orderId).populate({
      path: 'items.product',
      model: 'Product'
    });

    if (!order) {
      return { success: false, message: 'Không tìm thấy đơn hàng' };
    }

    return { success: true, order };
  } catch (error) {
    console.error('Lỗi khi lấy đơn hàng:', error);
    return { success: false, message: error.message };
  }
};

// Lấy tất cả đơn hàng của người dùng
const getUserOrders = async (telegramId) => {
  try {
    const orders = await Order.find({ 'user.telegramId': telegramId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'items.product',
        model: 'Product'
      });

    return { success: true, orders };
  } catch (error) {
    console.error('Lỗi khi lấy đơn hàng của người dùng:', error);
    return { success: false, message: error.message };
  }
};

// Cập nhật trạng thái đơn hàng
const updateOrderStatus = async (orderId, status) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return { success: false, message: 'Không tìm thấy đơn hàng' };
    }

    order.status = status;
    await order.save();

    return { success: true, order };
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
    return { success: false, message: error.message };
  }
};

// Cập nhật trạng thái thanh toán
const updatePaymentStatus = async (orderId, paymentStatus) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return { success: false, message: 'Không tìm thấy đơn hàng' };
    }

    order.paymentStatus = paymentStatus;
    await order.save();

    return { success: true, order };
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái thanh toán:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  updatePaymentStatus
}; 