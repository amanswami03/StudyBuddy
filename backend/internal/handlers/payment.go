package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"studybuddy/internal/db"
	"time"

	razorpay "github.com/razorpay/razorpay-go"
)

type CreateOrderRequest struct {
	PlanID   int    `json:"plan_id"`
	Amount   int    `json:"amount"` // in paise
	PlanName string `json:"plan_name"`
}

type CreateOrderResponse struct {
	ID       string `json:"id"`
	Entity   string `json:"entity"`
	Amount   int    `json:"amount"`
	Currency string `json:"currency"`
}

type VerifyPaymentRequest struct {
	OrderID   string `json:"order_id"`
	PaymentID string `json:"payment_id"`
	Signature string `json:"signature"`
}

// CreateOrder creates a Razorpay order via API
func CreateOrder(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		log.Printf("❌ Auth error: %v", err)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ Decode error: %v", err)
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	// Validate amount
	if req.Amount < 100 {
		http.Error(w, "minimum amount is 100 paise", http.StatusBadRequest)
		return
	}

	// Get Razorpay keys
	keyID := os.Getenv("RAZORPAY_KEY_ID")
	keySecret := os.Getenv("RAZORPAY_KEY_SECRET")

	if keyID == "" || keySecret == "" {
		log.Println("❌ Razorpay credentials not configured")
		http.Error(w, "payment gateway not configured", http.StatusInternalServerError)
		return
	}

	// Initialize Razorpay client
	client := razorpay.NewClient(keyID, keySecret)

	// Create order request body
	orderRequest := map[string]interface{}{
		"amount":   req.Amount,
		"currency": "INR",
		"receipt":  "receipt_order_" + time.Now().Format("20060102150405"),
		"notes": map[string]interface{}{
			"user_id":   userID,
			"plan_id":   req.PlanID,
			"plan_name": req.PlanName,
		},
	}

	// Call Razorpay API
	body, err := client.Order.Create(orderRequest, nil)
	if err != nil {
		log.Printf("❌ Failed to create Razorpay order: %v", err)
		http.Error(w, "failed to create order: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if body == nil {
		log.Printf("❌ Razorpay returned nil body")
		http.Error(w, "invalid response from payment gateway", http.StatusInternalServerError)
		return
	}

	// Parse response
	var orderResp CreateOrderResponse
	data, _ := json.Marshal(body)
	json.Unmarshal(data, &orderResp)

	// Handle case where ID field might be in different format
	if orderResp.ID == "" {
		if id, ok := body["id"].(string); ok {
			orderResp.ID = id
		}
	}
	if orderResp.Entity == "" {
		orderResp.Entity = "order"
	}
	if orderResp.Amount == 0 {
		orderResp.Amount = req.Amount
	}
	if orderResp.Currency == "" {
		orderResp.Currency = "INR"
	}

	if orderResp.ID == "" {
		log.Printf("❌ No order ID in response: %v", body)
		http.Error(w, "failed to create order: no order id returned", http.StatusInternalServerError)
		return
	}

	log.Printf("✅ Order created: %s for user %d", orderResp.ID, userID)

	// Store order in database for tracking
	_, err = db.DB.Exec(
		`INSERT INTO orders (user_id, order_id, plan_id, plan_name, amount, status, created_at) 
		 VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
		 ON CONFLICT (order_id) DO NOTHING`,
		userID, orderResp.ID, req.PlanID, req.PlanName, req.Amount,
	)
	if err != nil {
		log.Printf("⚠️  Warning: Could not store order in DB: %v", err)
		// Don't fail - Razorpay order was created successfully
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(orderResp)
}

// VerifyPayment verifies Razorpay payment signature
func VerifyPayment(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req VerifyPaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	if req.OrderID == "" || req.PaymentID == "" || req.Signature == "" {
		http.Error(w, "missing required fields", http.StatusBadRequest)
		return
	}

	// Get Razorpay key secret
	keySecret := os.Getenv("RAZORPAY_KEY_SECRET")
	if keySecret == "" {
		http.Error(w, "payment gateway not configured", http.StatusInternalServerError)
		return
	}

	// Verify signature: HMAC-SHA256(order_id|payment_id, key_secret)
	message := req.OrderID + "|" + req.PaymentID
	hash := hmac.New(sha256.New, []byte(keySecret))
	hash.Write([]byte(message))
	expectedSignature := hex.EncodeToString(hash.Sum(nil))

	if expectedSignature != req.Signature {
		log.Printf("❌ Invalid signature for order %s", req.OrderID)
		http.Error(w, "invalid signature", http.StatusBadRequest)
		return
	}

	log.Printf("✅ Signature verified for order %s", req.OrderID)

	// Get order details
	var planID int
	var planName string
	var amount int
	err = db.DB.QueryRow(
		`SELECT plan_id, plan_name, amount FROM orders WHERE order_id=$1 AND user_id=$2 AND status='pending'`,
		req.OrderID, userID,
	).Scan(&planID, &planName, &amount)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "order not found or already processed", http.StatusNotFound)
		} else {
			log.Printf("❌ Error fetching order: %v", err)
			http.Error(w, "server error", http.StatusInternalServerError)
		}
		return
	}

	// Update order status to completed
	_, err = db.DB.Exec(
		`UPDATE orders SET status='completed', payment_id=$1, verified_at=NOW() WHERE order_id=$2`,
		req.PaymentID, req.OrderID,
	)
	if err != nil {
		log.Printf("❌ Error updating order: %v", err)
		http.Error(w, "failed to update order", http.StatusInternalServerError)
		return
	}

	// Create or update subscription
	expiresAt := time.Now().AddDate(0, 1, 0) // 1 month from now
	_, err = db.DB.Exec(
		`INSERT INTO subscriptions (user_id, plan_id, plan_name, status, expires_at, created_at) 
		 VALUES ($1, $2, $3, 'active', $4, NOW())
		 ON CONFLICT (user_id) DO UPDATE SET plan_id=$2, plan_name=$3, status='active', expires_at=$4`,
		userID, planID, planName, expiresAt,
	)
	if err != nil {
		log.Printf("⚠️  Warning: Could not create subscription: %v", err)
	}

	// Log transaction
	_, err = db.DB.Exec(
		`INSERT INTO transactions (user_id, order_id, payment_id, plan_name, amount, status, created_at) 
		 VALUES ($1, $2, $3, $4, $5, 'success', NOW())`,
		userID, req.OrderID, req.PaymentID, planName, amount,
	)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "payment verified and subscription activated",
		"order_id": req.OrderID,
		"plan_name": planName,
	})
}

// GetSubscriptionStatus returns user's current subscription status
func GetSubscriptionStatus(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var planID int
	var planName string
	var expiresAt sql.NullTime
	var status string

	err = db.DB.QueryRow(
		`SELECT plan_id, plan_name, expires_at, status FROM subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`,
		userID,
	).Scan(&planID, &planName, &expiresAt, &status)

	if err != nil {
		if err == sql.ErrNoRows {
			// No subscription
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"subscribed": false,
				"plan_id":    nil,
				"plan_name":  nil,
			})
			return
		}
		log.Printf("❌ Error fetching subscription: %v", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Check if expired
	isActive := status == "active" && (expiresAt.Time.After(time.Now()) || !expiresAt.Valid)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"subscribed": isActive,
		"plan_id":    planID,
		"plan_name":  planName,
		"expires_at": expiresAt.Time,
		"status":     status,
	})
}

// GetFeatureLimits returns subscription tier and feature limits
func GetFeatureLimits(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	tier := GetUserSubscriptionTier(userID)
	limits := tierLimits[tier]

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"tier":        string(tier),
		"max_groups":  limits.MaxGroups,
		"max_storage": limits.MaxStorage,
	})
}
