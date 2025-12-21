package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
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
