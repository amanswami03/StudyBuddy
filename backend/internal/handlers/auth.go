package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"studybuddy/internal/db"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte("supersecretkey") // ⚠️ Use env var in prod

type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Username string `json:"username,omitempty"`
}

type AuthResponse struct {
	Token string `json:"token"`
}

func Signup(w http.ResponseWriter, r *http.Request) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error hashing password", http.StatusInternalServerError)
		return
	}

	_, err = db.DB.Exec(`INSERT INTO users (username, email, password, created_at)
	VALUES ($1, $2, $3, $4)`, req.Username, strings.ToLower(req.Email), string(hash), time.Now())
	if err != nil {
		http.Error(w, "Email already exists or DB error", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"message":"Signup successful"}`))
}

func Login(w http.ResponseWriter, r *http.Request) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var hashedPassword string
	var userID int
	err := db.DB.QueryRow(`SELECT id, password FROM users WHERE LOWER(email) = LOWER($1)`, req.Email).
		Scan(&userID, &hashedPassword)

	if err == sql.ErrNoRows || bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password)) != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Update login streak and award points
	if err := db.UpdateLoginStreak(userID); err != nil {
		// Log error but don't fail login
		fmt.Printf("Failed to update login streak for user %d: %v\n", userID, err)
	}

	// Log the sign-in
	ip := r.RemoteAddr
	userAgent := r.Header.Get("User-Agent")
	_, err = db.DB.Exec(`INSERT INTO signin_logs (user_id, ip_address, user_agent) VALUES ($1, $2, $3)`,
		userID, ip, userAgent)
	if err != nil {
		// Log error but don't fail login
		fmt.Printf("Failed to log sign-in: %v\n", err)
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		http.Error(w, "Token generation failed", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(AuthResponse{Token: tokenString})
}

// returns user id (int) and error if token missing/invalid
func GetUserIDFromRequest(r *http.Request) (int, error) {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return 0, fmt.Errorf("no auth header")
	}
	// expected: "Bearer <token>"
	parts := strings.Split(auth, " ")
	if len(parts) != 2 {
		return 0, fmt.Errorf("invalid auth header")
	}
	tokenStr := parts[1]

	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		// validate alg if needed
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return 0, fmt.Errorf("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, fmt.Errorf("invalid claims")
	}
	uidRaw, ok := claims["user_id"]
	if !ok {
		return 0, fmt.Errorf("no user_id in token")
	}
	// jwt stores numbers as float64 when decoded from JSON
	var uid int
	switch v := uidRaw.(type) {
	case float64:
		uid = int(v)
	case int:
		uid = v
	default:
		return 0, fmt.Errorf("invalid user_id type")
	}
	return uid, nil
}

func GetUserIDFromToken(tokenStr string) (int, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return 0, errors.New("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, errors.New("invalid claims")
	}
	uidRaw, ok := claims["user_id"]
	if !ok {
		return 0, errors.New("no user_id")
	}
	switch v := uidRaw.(type) {
	case float64:
		return int(v), nil
	case int:
		return v, nil
	default:
		return 0, errors.New("invalid user_id type")
	}
}

// ForgotPassword generates a reset token and sends email
func ForgotPassword(w http.ResponseWriter, r *http.Request) {
	type ForgotPasswordRequest struct {
		Email string `json:"email"`
	}

	var req ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Email == "" {
		http.Error(w, "Email is required", http.StatusBadRequest)
		return
	}

	// Check if user exists
	var userID int
	err := db.DB.QueryRow(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, req.Email).Scan(&userID)
	if err == sql.ErrNoRows {
		// Don't reveal if email exists for security, but log it
		fmt.Printf("⚠️  Forgot password request for non-existent email: %s\n", req.Email)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "If this email exists, you will receive a reset link",
		})
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Generate reset token
	resetToken := generateResetToken()
	expiresAt := time.Now().AddDate(0, 0, 1) // 24 hours

	// Store token in database
	_, err = db.DB.Exec(
		`UPDATE users SET reset_token=$1, reset_token_expires=$2 WHERE id=$3`,
		resetToken, expiresAt, userID,
	)
	if err != nil {
		fmt.Printf("❌ Error storing reset token: %v\n", err)
		http.Error(w, "Failed to generate reset link", http.StatusInternalServerError)
		return
	}

	// Send email with reset link
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", frontendURL, resetToken)

	err = sendPasswordResetEmail(req.Email, resetLink)
	if err != nil {
		fmt.Printf("❌ Error sending email: %v\n", err)
		http.Error(w, "Failed to send reset email", http.StatusInternalServerError)
		return
	}

	fmt.Printf("✅ Password reset email sent to: %s\n", req.Email)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "If this email exists, you will receive a reset link",
	})
}

// ResetPassword resets the password using the reset token
func ResetPassword(w http.ResponseWriter, r *http.Request) {
	type ResetPasswordRequest struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}

	var req ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.Token == "" || req.NewPassword == "" {
		http.Error(w, "Token and new password are required", http.StatusBadRequest)
		return
	}

	if len(req.NewPassword) < 6 {
		http.Error(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	// Find user with this token
	var userID int
	var expiresAt sql.NullTime
	err := db.DB.QueryRow(
		`SELECT id, reset_token_expires FROM users WHERE reset_token=$1`,
		req.Token,
	).Scan(&userID, &expiresAt)

	if err == sql.ErrNoRows {
		http.Error(w, "Invalid reset token", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Check if token is expired
	if expiresAt.Valid && expiresAt.Time.Before(time.Now()) {
		http.Error(w, "Reset token has expired", http.StatusBadRequest)
		return
	}

	// Hash new password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Error hashing password", http.StatusInternalServerError)
		return
	}

	// Update password and clear reset token
	_, err = db.DB.Exec(
		`UPDATE users SET password=$1, reset_token=NULL, reset_token_expires=NULL WHERE id=$2`,
		string(hash), userID,
	)
	if err != nil {
		fmt.Printf("❌ Error updating password: %v\n", err)
		http.Error(w, "Failed to reset password", http.StatusInternalServerError)
		return
	}

	fmt.Printf("✅ Password reset successfully for user %d\n", userID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Password reset successful",
	})
}

// Helper function to generate a secure reset token
func generateResetToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// Helper function to send password reset email via SendGrid
func sendPasswordResetEmail(email, resetLink string) error {
	apiKey := os.Getenv("SENDGRID_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("SENDGRID_API_KEY not configured")
	}

	fromEmail := os.Getenv("SENDGRID_FROM_EMAIL")
	if fromEmail == "" {
		fromEmail = "noreply@studybuddy.com"
	}

	// SendGrid API endpoint
	url := "https://api.sendgrid.com/v3/mail/send"

	// Email payload
	payload := map[string]interface{}{
		"personalizations": []map[string]interface{}{
			{
				"to": []map[string]string{
					{"email": email},
				},
			},
		},
		"from": map[string]string{
			"email": fromEmail,
			"name":  "StudyBuddy",
		},
		"subject": "Reset Your StudyBuddy Password",
		"content": []map[string]string{
			{
				"type": "text/html",
				"value": fmt.Sprintf(`
					<h2>Password Reset Request</h2>
					<p>You requested to reset your StudyBuddy password.</p>
					<p>Click the link below to reset your password (valid for 24 hours):</p>
					<p><a href="%s" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
					<p>Or copy this link: %s</p>
					<p>If you didn't request this, please ignore this email.</p>
					<hr>
					<p><small>StudyBuddy - Learning Management System</small></p>
				`, resetLink, resetLink),
			},
		},
	}

	// Marshal payload
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("error marshaling email payload: %v", err)
	}

	// Create request
	req, err := http.NewRequest("POST", url, strings.NewReader(string(body)))
	if err != nil {
		return fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))
	req.Header.Set("Content-Type", "application/json")

	// Send request
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error sending email: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode > 299 {
		return fmt.Errorf("SendGrid API error: status %d", resp.StatusCode)
	}

	return nil
}
