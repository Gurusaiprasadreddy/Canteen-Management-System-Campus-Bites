# 💳 Razorpay Payment Testing Guide - Campus Bites

## 🎯 How to Test Payments (Test Mode)

### **Test Cards for Success**

Use these card details in the Razorpay checkout:

**Credit/Debit Card:**
```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits (e.g., 123)
Expiry: Any future date (e.g., 12/25)
Name: Any name
```

**Alternative Test Cards:**
```
MasterCard: 5555 5555 5555 4444
Visa: 4012 8888 8888 1881
```

### **Test UPI IDs**
```
success@razorpay
failure@razorpay (to test failures)
```

### **Test Netbanking**
- Select any bank from the list
- You'll be redirected to a test page
- Click "Success" to complete payment

---

## 🚀 Complete Order Flow Testing

### **Step-by-Step:**

1. **Login as Student**
   - Go to: https://foodtech-campus-1.preview.emergentagent.com/student/login
   - Roll: `CB.SC.U4CSE23001`
   - Password: `test123`

2. **Browse Menu**
   - Click on any canteen (Sopanam/MBA/Samudra)
   - Add items to cart using "Add to Cart" button

3. **Go to Cart**
   - Click cart icon in header
   - Review items and quantities
   - Click "Proceed to Payment"

4. **Razorpay Checkout**
   - Razorpay modal will appear
   - Choose payment method:
     - **Card**: Use `4111 1111 1111 1111`
     - **UPI**: Use `success@razorpay`
     - **Netbanking**: Select any bank → Click Success

5. **Success Animation**
   - 🎉 Confetti animation plays
   - Token number is displayed
   - Automatically redirects to order tracking

6. **Track Order**
   - See your order with token number
   - Live status updates (WebSocket)
   - Real-time connection indicator

---

## 🧪 Testing Different Scenarios

### **✅ Successful Payment**
```
Card: 4111 1111 1111 1111
UPI: success@razorpay
Result: Order placed, token generated
```

### **❌ Failed Payment**
```
UPI: failure@razorpay
Result: Payment failed, order cancelled
```

### **⏱️ Timeout Test**
- Add items to cart
- Start checkout
- Wait 10 minutes without paying
- Order will auto-cancel

---

## 🔍 What to Verify

- [ ] Cart items persist in localStorage
- [ ] Razorpay modal opens with correct amount
- [ ] Payment success shows confetti celebration
- [ ] Token number is displayed prominently
- [ ] Order appears in tracking with "PREPARING" status
- [ ] WebSocket shows "Live" connection
- [ ] Spending analytics updates (Daily/Weekly/Monthly)
- [ ] Bill is saved in order history

---

## 💡 Pro Tips

1. **Quick Testing**: Use `success@razorpay` UPI for instant success
2. **Card Testing**: Use `4111 1111 1111 1111` - easiest to remember
3. **Check Console**: Open browser DevTools to see WebSocket events
4. **Multiple Orders**: Test with different canteens to see analytics

---

## 🎨 Expected Animations

1. **Cart Page**: Smooth add/remove with fade transitions
2. **Checkout Click**: Button scales down (0.98x)
3. **Payment Success**: 
   - 50 confetti particles fall from top
   - Success modal scales in with spring effect
   - Checkmark animates with pulse rings
   - Token number highlighted in orange gradient box
4. **Redirect**: Smooth fade transition to tracking page

---

## 🛠️ Troubleshooting

**Issue**: Razorpay modal doesn't open
- **Fix**: Check browser console for script loading errors
- Ensure popup blockers are disabled

**Issue**: Payment succeeds but order not created
- **Fix**: Check backend logs: `tail -f /var/log/supervisor/backend.*.log`
- Verify WebSocket connection in browser DevTools → Network → WS

**Issue**: Token number not displayed
- **Fix**: Check if payment verification API succeeded
- Look for `order_update` socket event in console

---

## 📊 Analytics to Check After Testing

1. **Spending Analytics**: `/student/spending`
   - Daily total should increase
   - Bill should appear in recent bills

2. **Management Dashboard**: `/management/dashboard`
   - Total revenue increases
   - Order count increments
   - Item appears in top selling items

3. **Order History**: `/student/orders/history`
   - Completed orders listed
   - All order details visible

---

## 🎯 Success Checklist

- [x] Payment modal opens
- [x] Card/UPI payment works
- [x] Success animation plays (confetti + modal)
- [x] Token number displayed
- [x] WebSocket connection shows "Live"
- [x] Order tracking updates in real-time
- [x] Spending analytics updated
- [x] Bill saved in database

**All features working? You're ready for production! 🚀**
