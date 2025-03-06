const TelegramBot = require('node-telegram-bot-api');
const productController = require('./controllers/productController');
const cartController = require('./controllers/cartController');
const orderController = require('./controllers/orderController');

// Khởi tạo các trạng thái cho người dùng
const userStates = new Map();
const userCarts = new Map();

// Các trạng thái có thể có của người dùng
const STATES = {
    IDLE: 'IDLE',
    SELECTING_CATEGORY: 'SELECTING_CATEGORY',
    SELECTING_PRODUCT: 'SELECTING_PRODUCT',
    SELECTING_SIZE: 'SELECTING_SIZE',
    SELECTING_CRUST: 'SELECTING_CRUST',
    ENTERING_QUANTITY: 'ENTERING_QUANTITY',
    ENTERING_ADDRESS: 'ENTERING_ADDRESS',
    SELECTING_PAYMENT: 'SELECTING_PAYMENT',
    CONFIRMING_ORDER: 'CONFIRMING_ORDER',
    SELECTING_TOPPING: 'SELECTING_TOPPING'
};

// Khởi tạo bot
const setupBot = (bot) => {
    // Xử lý lệnh /start
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        userStates.set(chatId, STATES.IDLE);

        const welcomeMessage = `
Chào mừng bạn đến với Pizza Bot! 🍕

Tôi có thể giúp bạn:
1. Xem menu và đặt pizza 🍽
2. Quản lý giỏ hàng 🛒
3. Theo dõi đơn hàng 📦
4. Hỗ trợ khách hàng 💬

Hãy chọn một trong các lệnh sau:
/menu - Xem menu
/cart - Xem giỏ hàng
/orders - Xem đơn hàng
/help - Trợ giúp
    `;

        const keyboard = {
            reply_markup: {
                keyboard: [
                    ['🍕 Xem Menu', '🛒 Giỏ hàng'],
                    ['📦 Đơn hàng của tôi', '💬 Hỗ trợ']
                ],
                resize_keyboard: true
            }
        };

        bot.sendMessage(chatId, welcomeMessage, keyboard);
    });

    // Xử lý lệnh /menu hoặc nút "Xem Menu"
    bot.onText(/\/menu|🍕 Xem Menu/, async (msg) => {
        const chatId = msg.chat.id;
        userStates.set(chatId, STATES.SELECTING_CATEGORY);

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🍕 Pizza', callback_data: 'category_pizza' },
                        { text: '🍗 Món phụ', callback_data: 'category_sides' }
                    ],
                    [
                        { text: '🥤 Đồ uống', callback_data: 'category_drinks' },
                        { text: '🍰 Tráng miệng', callback_data: 'category_desserts' }
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, 'Chọn danh mục món ăn:', keyboard);
    });

    // Xử lý callback query khi chọn danh mục
    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        if (data.startsWith('category_')) {
            const category = data.split('_')[1];
            const { success, products } = await productController.getProductsByCategory(category);

            if (success && products.length > 0) {
                const keyboard = {
                    reply_markup: {
                        inline_keyboard: products.map(product => ([
                            { text: `${product.name} - ${product.price.toLocaleString()}đ`, callback_data: `product_${product._id}` }
                        ]))
                    }
                };

                bot.sendMessage(chatId, 'Chọn sản phẩm:', keyboard);
            } else {
                bot.sendMessage(chatId, 'Không có sản phẩm nào trong danh mục này.');
            }
        }
        else if (data.startsWith('product_')) {
            const productId = data.split('_')[1];
            const { success, product } = await productController.getProductById(productId);

            if (success) {
                userStates.set(chatId, STATES.SELECTING_SIZE);
                userCarts.set(chatId, { productId, options: [] });

                let message = `
${product.name}
${product.description}
Giá: ${product.price.toLocaleString()}đ

Chọn kích cỡ:`;

                const sizeOption = product.options.find(opt => opt.name === 'Kích cỡ');
                if (sizeOption) {
                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: sizeOption.choices.map(choice => ([
                                {
                                    text: `${choice.name} (${choice.priceAdjustment >= 0 ? '+' : ''}${choice.priceAdjustment.toLocaleString()}đ)`,
                                    callback_data: `size_${choice.name}`
                                }
                            ]))
                        }
                    };

                    bot.sendMessage(chatId, message, keyboard);
                } else {
                    userStates.set(chatId, STATES.ENTERING_QUANTITY);
                    bot.sendMessage(chatId, 'Nhập số lượng bạn muốn đặt:');
                }
            }
        }
        else if (data.startsWith('size_')) {
            const size = data.split('_')[1];
            const userData = userCarts.get(chatId);
            userData.options.push({ option: 'Kích cỡ', choice: size });
            userCarts.set(chatId, userData);

            const { success, product } = await productController.getProductById(userData.productId);

            if (success) {
                if (product.category === 'pizza' && product.options.find(opt => opt.name === 'Đế bánh')) {
                    userStates.set(chatId, STATES.SELECTING_CRUST);

                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: product.options
                                .find(opt => opt.name === 'Đế bánh')
                                .choices.map(choice => ([
                                    {
                                        text: `${choice.name} (${choice.priceAdjustment >= 0 ? '+' : ''}${choice.priceAdjustment.toLocaleString()}đ)`,
                                        callback_data: `crust_${choice.name}`
                                    }
                                ]))
                        }
                    };

                    bot.sendMessage(chatId, 'Chọn loại đế bánh:', keyboard);
                } 
                else if (product.category === 'desserts' && product.options.find(opt => opt.name === 'Topping')) {
                    userStates.set(chatId, STATES.SELECTING_TOPPING);

                    const keyboard = {
                        reply_markup: {
                            inline_keyboard: product.options
                                .find(opt => opt.name === 'Topping')
                                .choices.map(choice => ([
                                    {
                                        text: `${choice.name} (${choice.priceAdjustment >= 0 ? '+' : ''}${choice.priceAdjustment.toLocaleString()}đ)`,
                                        callback_data: `topping_${choice.name}`
                                    }
                                ]))
                        }
                    };

                    bot.sendMessage(chatId, 'Chọn topping:', keyboard);
                }
                else {
                    userStates.set(chatId, STATES.ENTERING_QUANTITY);
                    bot.sendMessage(chatId, 'Nhập số lượng bạn muốn đặt:');
                }
            }
        }
        else if (data.startsWith('crust_')) {
            const crust = data.split('_')[1];
            const userData = userCarts.get(chatId);
            userData.options.push({ option: 'Đế bánh', choice: crust });
            userCarts.set(chatId, userData);

            userStates.set(chatId, STATES.ENTERING_QUANTITY);
            bot.sendMessage(chatId, 'Nhập số lượng bạn muốn đặt:');
        }
        else if (data.startsWith('topping_')) {
            const topping = data.split('_')[1];
            const userData = userCarts.get(chatId);
            userData.options.push({ option: 'Topping', choice: topping });
            userCarts.set(chatId, userData);

            userStates.set(chatId, STATES.ENTERING_QUANTITY);
            bot.sendMessage(chatId, 'Nhập số lượng bạn muốn đặt:');
        }
        else if (data.startsWith('remove_')) {
            const itemIndex = parseInt(data.split('_')[1]);
            const { success, cart } = await cartController.removeFromCart(chatId.toString(), itemIndex);

            if (success) {
                if (cart.items.length === 0) {
                    bot.sendMessage(chatId, 'Giỏ hàng của bạn đã trống');
                    return;
                }

                let cartMessage = 'Giỏ hàng của bạn:';
                const keyboard = {
                    reply_markup: {
                        inline_keyboard: []
                    }
                };

                cart.items.forEach((item, index) => {
                    cartMessage += `\n\n${index + 1}. ${item.product.name}`;
                    item.selectedOptions.forEach(opt => {
                        cartMessage += `\n   - ${opt.option}: ${opt.choice}`;
                    });
                    cartMessage += `\n   Số lượng: ${item.quantity}`;
                    cartMessage += `\n   Giá: ${item.price.toLocaleString()}đ`;

                    keyboard.reply_markup.inline_keyboard.push([
                        { text: `❌ Xóa ${item.product.name}`, callback_data: `remove_${index}` }
                    ]);
                });

                cartMessage += `\n\nTổng cộng: ${cart.totalAmount.toLocaleString()}đ`;

                keyboard.reply_markup.inline_keyboard.push([
                    { text: '🗑 Xóa giỏ hàng', callback_data: 'clear_cart' },
                    { text: '💳 Thanh toán', callback_data: 'checkout' }
                ]);

                bot.editMessageText(cartMessage, {
                    chat_id: chatId,
                    message_id: callbackQuery.message.message_id,
                    reply_markup: keyboard.reply_markup
                });
            } else {
                bot.sendMessage(chatId, 'Có lỗi xảy ra khi xóa sản phẩm. Vui lòng thử lại.');
            }
        }
        else if (data === 'clear_cart') {
            const { success } = await cartController.clearCart(chatId.toString());

            if (success) {
                bot.editMessageText('Giỏ hàng của bạn đã được xóa', {
                    chat_id: chatId,
                    message_id: callbackQuery.message.message_id
                });
            } else {
                bot.sendMessage(chatId, 'Có lỗi xảy ra khi xóa giỏ hàng. Vui lòng thử lại.');
            }
        }
        else if (data === 'checkout') {
            userStates.set(chatId, STATES.ENTERING_ADDRESS);
            bot.sendMessage(chatId, 'Vui lòng nhập địa chỉ giao hàng của bạn:');
        }
        else if (data === 'continue_shopping') {
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🍕 Pizza', callback_data: 'category_pizza' },
                            { text: '🍗 Món phụ', callback_data: 'category_sides' }
                        ],
                        [
                            { text: '🥤 Đồ uống', callback_data: 'category_drinks' },
                            { text: '🍰 Tráng miệng', callback_data: 'category_desserts' }
                        ]
                    ]
                }
            };

            bot.sendMessage(chatId, 'Chọn danh mục món ăn:', keyboard);
        }
        else if (data.startsWith('payment_')) {
            const paymentMethod = data.split('_')[1];
            const userData = userCarts.get(chatId);

            if (!userData) {
                bot.sendMessage(chatId, 'Có lỗi xảy ra. Vui lòng thử lại.');
                return;
            }

            // Lấy thông tin người dùng từ Telegram
            const user = callbackQuery.from;

            // Kiểm tra địa chỉ giao hàng
            if (!userData.deliveryAddress) {
                bot.sendMessage(chatId, 'Vui lòng nhập địa chỉ giao hàng trước khi thanh toán.');
                userStates.set(chatId, STATES.ENTERING_ADDRESS);
                return;
            }

            // Tạo đơn hàng mới
            const { success, order } = await orderController.createOrder(
                chatId.toString(),
                {
                    firstName: user.first_name || '',
                    lastName: user.last_name || '',
                    username: user.username || ''
                },
                userData.deliveryAddress,
                paymentMethod
            );

            if (success) {
                userStates.set(chatId, STATES.IDLE);
                userCarts.delete(chatId);

                let orderMessage = `
🎉 Đặt hàng thành công!

Mã đơn hàng: ${order._id}
Trạng thái: ${order.status}
Phương thức thanh toán: ${paymentMethod === 'cash' ? 'Tiền mặt' : 'Thẻ'}

Địa chỉ giao hàng:
${order.deliveryAddress}

Chi tiết đơn hàng:`;

                order.items.forEach((item, index) => {
                    orderMessage += `\n\n${index + 1}. ${item.product.name}`;
                    item.selectedOptions.forEach(opt => {
                        orderMessage += `\n   - ${opt.option}: ${opt.choice}`;
                    });
                    orderMessage += `\n   Số lượng: ${item.quantity}`;
                    orderMessage += `\n   Giá: ${item.price.toLocaleString()}đ`;
                });

                orderMessage += `\n\nTổng cộng: ${order.totalAmount.toLocaleString()}đ`;
                orderMessage += '\n\nCảm ơn bạn đã đặt hàng! 🙏';

                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📦 Xem đơn hàng', callback_data: `view_order_${order._id}` },
                                { text: '🍕 Đặt thêm', callback_data: 'continue_shopping' }
                            ]
                        ]
                    }
                };

                bot.sendMessage(chatId, orderMessage, keyboard);
            } else {
                bot.sendMessage(chatId, 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
            }
        }
        else if (data.startsWith('view_order_')) {
            const orderId = data.split('_')[2];
            const { success, order } = await orderController.getOrderById(orderId);

            if (success) {
                let orderMessage = `
Chi tiết đơn hàng:

Mã đơn hàng: ${order._id}
Trạng thái: ${order.status}
Phương thức thanh toán: ${order.paymentMethod === 'cash' ? 'Tiền mặt' : 'Thẻ'}
Trạng thái thanh toán: ${order.paymentStatus}

Địa chỉ giao hàng:
${order.deliveryAddress}

Các món đã đặt:`;

                order.items.forEach((item, index) => {
                    orderMessage += `\n\n${index + 1}. ${item.product.name}`;
                    item.selectedOptions.forEach(opt => {
                        orderMessage += `\n   - ${opt.option}: ${opt.choice}`;
                    });
                    orderMessage += `\n   Số lượng: ${item.quantity}`;
                    orderMessage += `\n   Giá: ${item.price.toLocaleString()}đ`;
                });

                orderMessage += `\n\nTổng cộng: ${order.totalAmount.toLocaleString()}đ`;
                orderMessage += `\nThời gian đặt: ${new Date(order.createdAt).toLocaleString('vi-VN')}`;

                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🍕 Đặt thêm', callback_data: 'continue_shopping' }
                            ]
                        ]
                    }
                };

                bot.sendMessage(chatId, orderMessage, keyboard);
            } else {
                bot.sendMessage(chatId, 'Có lỗi xảy ra khi lấy thông tin đơn hàng. Vui lòng thử lại.');
            }
        }
        else if (data === 'view_cart') {
            const { success, cart } = await cartController.getOrCreateCart(chatId.toString());

            if (success) {
                if (cart.items.length === 0) {
                    bot.sendMessage(chatId, 'Giỏ hàng của bạn đang trống');
                    return;
                }

                let cartMessage = 'Giỏ hàng của bạn:';
                const keyboard = {
                    reply_markup: {
                        inline_keyboard: []
                    }
                };

                cart.items.forEach((item, index) => {
                    cartMessage += `\n\n${index + 1}. ${item.product.name}`;
                    item.selectedOptions.forEach(opt => {
                        cartMessage += `\n   - ${opt.option}: ${opt.choice}`;
                    });
                    cartMessage += `\n   Số lượng: ${item.quantity}`;
                    cartMessage += `\n   Giá: ${item.price.toLocaleString()}đ`;

                    keyboard.reply_markup.inline_keyboard.push([
                        { text: `❌ Xóa ${item.product.name}`, callback_data: `remove_${index}` }
                    ]);
                });

                cartMessage += `\n\nTổng cộng: ${cart.totalAmount.toLocaleString()}đ`;

                keyboard.reply_markup.inline_keyboard.push([
                    { text: '🗑 Xóa giỏ hàng', callback_data: 'clear_cart' },
                    { text: '💳 Thanh toán', callback_data: 'checkout' }
                ]);

                bot.sendMessage(chatId, cartMessage, keyboard);
            } else {
                bot.sendMessage(chatId, 'Có lỗi xảy ra khi lấy giỏ hàng. Vui lòng thử lại.');
            }
        }

        // Xóa nút bấm sau khi đã chọn
        try {
            bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
            console.error('Lỗi khi xóa callback query:', error);
        }
    });

    // Xử lý tin nhắn văn bản (cho số lượng và địa chỉ)
    bot.on('message', async (msg) => {
        if (msg.text.startsWith('/')) return; // Bỏ qua các lệnh

        const chatId = msg.chat.id;
        const state = userStates.get(chatId);

        if (state === STATES.ENTERING_QUANTITY) {
            const quantity = parseInt(msg.text);
            if (isNaN(quantity) || quantity <= 0) {
                bot.sendMessage(chatId, 'Vui lòng nhập một số hợp lệ lớn hơn 0');
                return;
            }

            const userData = userCarts.get(chatId);
            const { success, cart } = await cartController.addToCart(
                chatId.toString(),
                userData.productId,
                quantity,
                userData.options
            );

            if (success) {
                userStates.set(chatId, STATES.IDLE);
                userCarts.delete(chatId);

                let cartMessage = 'Đã thêm vào giỏ hàng!\n\nGiỏ hàng của bạn:';
                cart.items.forEach((item, index) => {
                    cartMessage += `\n\n${index + 1}. ${item.product.name}`;
                    item.selectedOptions.forEach(opt => {
                        cartMessage += `\n   - ${opt.option}: ${opt.choice}`;
                    });
                    cartMessage += `\n   Số lượng: ${item.quantity}`;
                    cartMessage += `\n   Giá: ${item.price.toLocaleString()}đ`;
                });
                cartMessage += `\n\nTổng cộng: ${cart.totalAmount.toLocaleString()}đ`;

                const keyboard = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '🛒 Xem giỏ hàng', callback_data: 'view_cart' },
                                { text: '🍕 Tiếp tục mua', callback_data: 'continue_shopping' }
                            ]
                        ]
                    }
                };

                bot.sendMessage(chatId, cartMessage, keyboard);
            } else {
                bot.sendMessage(chatId, 'Có lỗi xảy ra khi thêm vào giỏ hàng. Vui lòng thử lại.');
            }
        }
        else if (state === STATES.ENTERING_ADDRESS) {
            const address = msg.text;
            
            // Kiểm tra địa chỉ hợp lệ
            if (!address || address.trim().length < 10) {
                bot.sendMessage(chatId, 'Vui lòng nhập địa chỉ chi tiết (ít nhất 10 ký tự)');
                return;
            }

            userStates.set(chatId, STATES.SELECTING_PAYMENT);

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '💵 Tiền mặt', callback_data: 'payment_cash' },
                            { text: '💳 Thẻ', callback_data: 'payment_card' }
                        ]
                    ]
                }
            };

            // Lưu địa chỉ vào userCarts
            let userData = userCarts.get(chatId);
            if (!userData) {
                userData = { options: [] };
            }
            userData.deliveryAddress = address.trim();
            userCarts.set(chatId, userData);

            bot.sendMessage(chatId, `Địa chỉ giao hàng: ${address}\n\nChọn phương thức thanh toán:`, keyboard);
        }
    });

    // Xử lý lệnh /cart hoặc nút "Giỏ hàng"
    bot.onText(/\/cart|🛒 Giỏ hàng/, async (msg) => {
        const chatId = msg.chat.id;
        const { success, cart } = await cartController.getOrCreateCart(chatId.toString());

        if (success) {
            if (cart.items.length === 0) {
                bot.sendMessage(chatId, 'Giỏ hàng của bạn đang trống');
                return;
            }

            let cartMessage = 'Giỏ hàng của bạn:';
            const keyboard = {
                reply_markup: {
                    inline_keyboard: []
                }
            };

            cart.items.forEach((item, index) => {
                cartMessage += `\n\n${index + 1}. ${item.product.name}`;
                item.selectedOptions.forEach(opt => {
                    cartMessage += `\n   - ${opt.option}: ${opt.choice}`;
                });
                cartMessage += `\n   Số lượng: ${item.quantity}`;
                cartMessage += `\n   Giá: ${item.price.toLocaleString()}đ`;

                keyboard.reply_markup.inline_keyboard.push([
                    { text: `❌ Xóa ${item.product.name}`, callback_data: `remove_${index}` }
                ]);
            });

            cartMessage += `\n\nTổng cộng: ${cart.totalAmount.toLocaleString()}đ`;

            keyboard.reply_markup.inline_keyboard.push([
                { text: '🗑 Xóa giỏ hàng', callback_data: 'clear_cart' },
                { text: '💳 Thanh toán', callback_data: 'checkout' }
            ]);

            bot.sendMessage(chatId, cartMessage, keyboard);
        } else {
            bot.sendMessage(chatId, 'Có lỗi xảy ra khi lấy giỏ hàng. Vui lòng thử lại.');
        }
    });

    // Xử lý lệnh /orders hoặc nút "Đơn hàng của tôi"
    bot.onText(/\/orders|📦 Đơn hàng của tôi/, async (msg) => {
        const chatId = msg.chat.id;
        const { success, orders } = await orderController.getUserOrders(chatId.toString());

        if (success) {
            if (orders.length === 0) {
                bot.sendMessage(chatId, 'Bạn chưa có đơn hàng nào');
                return;
            }

            let orderMessage = 'Đơn hàng của bạn:';
            orders.forEach((order, index) => {
                orderMessage += `\n\nĐơn hàng #${index + 1}`;
                orderMessage += `\nTrạng thái: ${order.status}`;
                orderMessage += `\nTổng tiền: ${order.totalAmount.toLocaleString()}đ`;
                orderMessage += `\nThời gian: ${new Date(order.createdAt).toLocaleString('vi-VN')}`;
            });

            bot.sendMessage(chatId, orderMessage);
        } else {
            bot.sendMessage(chatId, 'Có lỗi xảy ra khi lấy đơn hàng. Vui lòng thử lại.');
        }
    });

    // Xử lý lệnh /help hoặc nút "Hỗ trợ"
    bot.onText(/\/help|💬 Hỗ trợ/, (msg) => {
        const chatId = msg.chat.id;
        const helpMessage = `
Hướng dẫn sử dụng Pizza Bot:

1. Xem menu và đặt hàng:
   - Gõ /menu hoặc nhấn "🍕 Xem Menu"
   - Chọn danh mục món ăn
   - Chọn món và tùy chỉnh theo ý thích
   - Nhập số lượng

2. Quản lý giỏ hàng:
   - Gõ /cart hoặc nhấn "🛒 Giỏ hàng"
   - Xem, chỉnh sửa hoặc xóa món
   - Tiến hành thanh toán

3. Theo dõi đơn hàng:
   - Gõ /orders hoặc nhấn "📦 Đơn hàng của tôi"
   - Xem trạng thái các đơn hàng

4. Hỗ trợ:
   - Gõ /help hoặc nhấn "💬 Hỗ trợ"
   - Liên hệ hotline: 1900-1234
   - Email: support@pizzabot.com

Chúc bạn ngon miệng! 🍕
    `;

        bot.sendMessage(chatId, helpMessage);
    });
};

module.exports = { setupBot }; 