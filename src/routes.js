const express = require('express');
const productController = require('./controllers/productController');
const orderController = require('./controllers/orderController');

const setupRoutes = (app, bot) => {
  // API endpoint để lấy tất cả sản phẩm
  app.get('/api/products', async (req, res) => {
    const { success, products, message } = await productController.getAllProducts();
    if (success) {
      res.json({ success, products });
    } else {
      res.status(500).json({ success, message });
    }
  });

  // API endpoint để lấy sản phẩm theo danh mục
  app.get('/api/products/category/:category', async (req, res) => {
    const { success, products, message } = await productController.getProductsByCategory(req.params.category);
    if (success) {
      res.json({ success, products });
    } else {
      res.status(500).json({ success, message });
    }
  });

  // API endpoint để lấy sản phẩm theo ID
  app.get('/api/products/:id', async (req, res) => {
    const { success, product, message } = await productController.getProductById(req.params.id);
    if (success) {
      res.json({ success, product });
    } else {
      res.status(404).json({ success, message });
    }
  });

  // API endpoint để tìm kiếm sản phẩm
  app.get('/api/products/search/:query', async (req, res) => {
    const { success, products, message } = await productController.searchProducts(req.params.query);
    if (success) {
      res.json({ success, products });
    } else {
      res.status(500).json({ success, message });
    }
  });

  // API endpoint để lấy đơn hàng theo ID
  app.get('/api/orders/:id', async (req, res) => {
    const { success, order, message } = await orderController.getOrderById(req.params.id);
    if (success) {
      res.json({ success, order });
    } else {
      res.status(404).json({ success, message });
    }
  });

  // API endpoint để lấy đơn hàng của người dùng
  app.get('/api/orders/user/:telegramId', async (req, res) => {
    const { success, orders, message } = await orderController.getUserOrders(req.params.telegramId);
    if (success) {
      res.json({ success, orders });
    } else {
      res.status(500).json({ success, message });
    }
  });

  // API endpoint để cập nhật trạng thái đơn hàng
  app.put('/api/orders/:id/status', async (req, res) => {
    const { status } = req.body;
    const { success, order, message } = await orderController.updateOrderStatus(req.params.id, status);
    
    if (success) {
      // Gửi thông báo cho người dùng qua Telegram
      const telegramId = order.user.telegramId;
      const notificationMessage = `
Đơn hàng của bạn đã được cập nhật!

Mã đơn hàng: ${order._id}
Trạng thái mới: ${status}
Thời gian: ${new Date().toLocaleString('vi-VN')}
      `;
      
      bot.sendMessage(telegramId, notificationMessage);
      res.json({ success, order });
    } else {
      res.status(500).json({ success, message });
    }
  });

  // API endpoint để cập nhật trạng thái thanh toán
  app.put('/api/orders/:id/payment', async (req, res) => {
    const { paymentStatus } = req.body;
    const { success, order, message } = await orderController.updatePaymentStatus(req.params.id, paymentStatus);
    
    if (success) {
      // Gửi thông báo cho người dùng qua Telegram
      const telegramId = order.user.telegramId;
      const notificationMessage = `
Trạng thái thanh toán đơn hàng đã được cập nhật!

Mã đơn hàng: ${order._id}
Trạng thái thanh toán: ${paymentStatus}
Thời gian: ${new Date().toLocaleString('vi-VN')}
      `;
      
      bot.sendMessage(telegramId, notificationMessage);
      res.json({ success, order });
    } else {
      res.status(500).json({ success, message });
    }
  });

  // Middleware xử lý lỗi
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi trong quá trình xử lý yêu cầu'
    });
  });
};

module.exports = { setupRoutes }; 