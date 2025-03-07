# Pizza Bot - Bot Telegram đặt pizza

Bot Telegram giống ứng dụng Pizza Hut cho phép người dùng xem menu, đặt pizza và các món ăn khác, quản lý giỏ hàng và theo dõi đơn hàng.

## Tính năng chính

- 🍕 Xem menu pizza và các món ăn khác
- 🛒 Thêm món vào giỏ hàng
- ✏️ Chỉnh sửa giỏ hàng
- 💳 Thanh toán đơn hàng
- 📦 Theo dõi trạng thái đơn hàng
- 💬 Hỗ trợ khách hàng

## Yêu cầu hệ thống

- Node.js v14 trở lên
- MongoDB v4.4 trở lên
- Token bot Telegram (từ BotFather)

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/your-username/pizza-bot.git
cd pizza-bot
```

2. Cài đặt các dependencies:
```bash
npm install
```

3. Tạo file .env và cấu hình các biến môi trường:
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
MONGODB_URI=mongodb://localhost:27017/pizzabot
PORT=3000
```

4. Khởi tạo dữ liệu mẫu:
```bash
node src/utils/seedData.js
```

5. Khởi động server:
```bash
npm start
```

Để phát triển (với nodemon):
```bash
npm run dev
```

## Sử dụng

1. Tìm bot trên Telegram theo username của bot
2. Bắt đầu chat với bot bằng lệnh `/start`
3. Sử dụng các nút và menu để:
   - Xem menu và đặt món
   - Quản lý giỏ hàng
   - Theo dõi đơn hàng
   - Nhận hỗ trợ

## API Endpoints

### Sản phẩm
- `GET /api/products` - Lấy tất cả sản phẩm
- `GET /api/products/category/:category` - Lấy sản phẩm theo danh mục
- `GET /api/products/:id` - Lấy sản phẩm theo ID
- `GET /api/products/search/:query` - Tìm kiếm sản phẩm

### Đơn hàng
- `GET /api/orders/:id` - Lấy đơn hàng theo ID
- `GET /api/orders/user/:telegramId` - Lấy đơn hàng của người dùng
- `PUT /api/orders/:id/status` - Cập nhật trạng thái đơn hàng
- `PUT /api/orders/:id/payment` - Cập nhật trạng thái thanh toán


