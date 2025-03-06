const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Lấy giỏ hàng của người dùng hoặc tạo mới nếu chưa có
const getOrCreateCart = async (telegramId) => {
  try {
    let cart = await Cart.findOne({ telegramId }).populate({
      path: 'items.product',
      model: 'Product'
    });

    if (!cart) {
      cart = new Cart({
        telegramId,
        items: [],
        totalAmount: 0
      });
      await cart.save();
    }

    return { success: true, cart };
  } catch (error) {
    console.error('Lỗi khi lấy giỏ hàng:', error);
    return { success: false, message: error.message };
  }
};

// Thêm sản phẩm vào giỏ hàng
const addToCart = async (telegramId, productId, quantity, selectedOptions) => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return { success: false, message: 'Không tìm thấy sản phẩm' };
    }

    // Tính giá sản phẩm với các tùy chọn đã chọn
    let productPrice = product.price;
    const optionsData = [];

    if (selectedOptions && selectedOptions.length > 0) {
      for (const selected of selectedOptions) {
        const productOption = product.options.find(opt => opt.name === selected.option);
        if (productOption) {
          const choice = productOption.choices.find(c => c.name === selected.choice);
          if (choice) {
            productPrice += choice.priceAdjustment;
            optionsData.push({
              option: selected.option,
              choice: selected.choice,
              priceAdjustment: choice.priceAdjustment
            });
          }
        }
      }
    }

    // Lấy hoặc tạo giỏ hàng
    const { success, cart, message } = await getOrCreateCart(telegramId);
    if (!success) {
      return { success, message };
    }

    // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
    const existingItemIndex = cart.items.findIndex(item => {
      // So sánh ID sản phẩm
      const productMatch = item.product._id.toString() === productId;
      
      // So sánh các tùy chọn đã chọn
      if (!productMatch) return false;
      
      // Nếu số lượng tùy chọn khác nhau, không phải cùng một mục
      if (item.selectedOptions.length !== optionsData.length) return false;
      
      // Kiểm tra từng tùy chọn
      for (const option of optionsData) {
        const matchingOption = item.selectedOptions.find(
          opt => opt.option === option.option && opt.choice === option.choice
        );
        if (!matchingOption) return false;
      }
      
      return true;
    });

    if (existingItemIndex !== -1) {
      // Cập nhật số lượng nếu sản phẩm đã tồn tại
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].price = productPrice * cart.items[existingItemIndex].quantity;
    } else {
      // Thêm sản phẩm mới vào giỏ hàng
      cart.items.push({
        product: productId,
        quantity,
        selectedOptions: optionsData,
        price: productPrice * quantity
      });
    }

    // Cập nhật tổng tiền
    cart.totalAmount = cart.items.reduce((total, item) => total + item.price, 0);
    cart.lastUpdated = Date.now();

    await cart.save();
    
    // Lấy giỏ hàng đã cập nhật với thông tin sản phẩm đầy đủ
    const updatedCart = await Cart.findOne({ telegramId }).populate({
      path: 'items.product',
      model: 'Product'
    });

    return { success: true, cart: updatedCart };
  } catch (error) {
    console.error('Lỗi khi thêm vào giỏ hàng:', error);
    return { success: false, message: error.message };
  }
};

// Cập nhật số lượng sản phẩm trong giỏ hàng
const updateCartItem = async (telegramId, itemIndex, quantity) => {
  try {
    const { success, cart, message } = await getOrCreateCart(telegramId);
    if (!success) {
      return { success, message };
    }

    if (itemIndex < 0 || itemIndex >= cart.items.length) {
      return { success: false, message: 'Không tìm thấy sản phẩm trong giỏ hàng' };
    }

    if (quantity <= 0) {
      // Xóa sản phẩm khỏi giỏ hàng nếu số lượng <= 0
      cart.items.splice(itemIndex, 1);
    } else {
      // Cập nhật số lượng
      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].price = (cart.items[itemIndex].price / cart.items[itemIndex].quantity) * quantity;
    }

    // Cập nhật tổng tiền
    cart.totalAmount = cart.items.reduce((total, item) => total + item.price, 0);
    cart.lastUpdated = Date.now();

    await cart.save();
    
    // Lấy giỏ hàng đã cập nhật với thông tin sản phẩm đầy đủ
    const updatedCart = await Cart.findOne({ telegramId }).populate({
      path: 'items.product',
      model: 'Product'
    });

    return { success: true, cart: updatedCart };
  } catch (error) {
    console.error('Lỗi khi cập nhật giỏ hàng:', error);
    return { success: false, message: error.message };
  }
};

// Xóa sản phẩm khỏi giỏ hàng
const removeFromCart = async (telegramId, itemIndex) => {
  try {
    const { success, cart, message } = await getOrCreateCart(telegramId);
    if (!success) {
      return { success, message };
    }

    if (itemIndex < 0 || itemIndex >= cart.items.length) {
      return { success: false, message: 'Không tìm thấy sản phẩm trong giỏ hàng' };
    }

    // Xóa sản phẩm khỏi giỏ hàng
    cart.items.splice(itemIndex, 1);

    // Cập nhật tổng tiền
    cart.totalAmount = cart.items.reduce((total, item) => total + item.price, 0);
    cart.lastUpdated = Date.now();

    await cart.save();
    
    // Lấy giỏ hàng đã cập nhật với thông tin sản phẩm đầy đủ
    const updatedCart = await Cart.findOne({ telegramId }).populate({
      path: 'items.product',
      model: 'Product'
    });

    return { success: true, cart: updatedCart };
  } catch (error) {
    console.error('Lỗi khi xóa khỏi giỏ hàng:', error);
    return { success: false, message: error.message };
  }
};

// Xóa toàn bộ giỏ hàng
const clearCart = async (telegramId) => {
  try {
    const { success, cart, message } = await getOrCreateCart(telegramId);
    if (!success) {
      return { success, message };
    }

    cart.items = [];
    cart.totalAmount = 0;
    cart.lastUpdated = Date.now();

    await cart.save();

    return { success: true, cart };
  } catch (error) {
    console.error('Lỗi khi xóa giỏ hàng:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  getOrCreateCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
}; 