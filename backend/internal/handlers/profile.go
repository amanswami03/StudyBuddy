package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"studybuddy/internal/db"
	"studybuddy/internal/models"

	"github.com/gorilla/mux"
	"golang.org/x/crypto/bcrypt"
)

type UpdateProfileRequest struct {
	Username             *string `json:"username,omitempty"`
	ProfilePic           *string `json:"profile_pic,omitempty"`
	ShowLastSeen         *bool   `json:"show_last_seen,omitempty"`
	ShowOnline           *bool   `json:"show_online,omitempty"`
	Phone                *string `json:"phone,omitempty"`
	NotificationsEnabled *bool   `json:"notifications_enabled,omitempty"`
}

type ChangeEmailRequest struct {
	NewEmail string `json:"new_email"`
	Password string `json:"password"`
}

type ChangePhoneRequest struct {
	NewPhone string `json:"new_phone"`
	Password string `json:"password"`
}

type DeleteAccountRequest struct {
	Password string `json:"password"`
}

func GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var user models.User
	err = db.DB.QueryRow(`
		SELECT id, username, email, profile_pic, last_seen, is_online, show_last_seen, show_online, phone, notifications_enabled, created_at
		FROM users WHERE id=$1`, userID).Scan(
		&user.ID, &user.Username, &user.Email, &user.ProfilePic, &user.LastSeen,
		&user.IsOnline, &user.ShowLastSeen, &user.ShowOnline, &user.Phone,
		&user.NotificationsEnabled, &user.CreatedAt)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// GetPublicProfile returns a public user profile by ID (accessible to everyone)
func GetPublicProfile(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	userIDStr := vars["id"]
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	var user models.User
	err = db.DB.QueryRow(`
		SELECT id, username, email, profile_pic, last_seen, is_online, show_last_seen, show_online, phone, created_at
		FROM users WHERE id=$1`, userID).Scan(
		&user.ID, &user.Username, &user.Email, &user.ProfilePic, &user.LastSeen,
		&user.IsOnline, &user.ShowLastSeen, &user.ShowOnline, &user.Phone, &user.CreatedAt)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Build dynamic update query
	setParts := []string{}
	args := []interface{}{}
	argCount := 1

	if req.Username != nil {
		setParts = append(setParts, "username=$"+strconv.Itoa(argCount))
		args = append(args, *req.Username)
		argCount++
	}
	if req.ProfilePic != nil {
		setParts = append(setParts, "profile_pic=$"+strconv.Itoa(argCount))
		args = append(args, *req.ProfilePic)
		argCount++
	}
	if req.ShowLastSeen != nil {
		setParts = append(setParts, "show_last_seen=$"+strconv.Itoa(argCount))
		args = append(args, *req.ShowLastSeen)
		argCount++
	}
	if req.ShowOnline != nil {
		setParts = append(setParts, "show_online=$"+strconv.Itoa(argCount))
		args = append(args, *req.ShowOnline)
		argCount++
	}
	if req.Phone != nil {
		setParts = append(setParts, "phone=$"+strconv.Itoa(argCount))
		args = append(args, *req.Phone)
		argCount++
	}
	if req.NotificationsEnabled != nil {
		setParts = append(setParts, "notifications_enabled=$"+strconv.Itoa(argCount))
		args = append(args, *req.NotificationsEnabled)
		argCount++
	}

	if len(setParts) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	query := "UPDATE users SET " + strings.Join(setParts, ", ") + " WHERE id=$" + strconv.Itoa(argCount)
	args = append(args, userID)

	_, err = db.DB.Exec(query, args...)
	if err != nil {
		http.Error(w, "Update failed", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Profile updated"}`))
}

func ChangeEmail(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req ChangeEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Verify password
	var hashedPassword string
	err = db.DB.QueryRow(`SELECT password FROM users WHERE id=$1`, userID).Scan(&hashedPassword)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password)) != nil {
		http.Error(w, "Invalid password", http.StatusUnauthorized)
		return
	}

	// Update email
	_, err = db.DB.Exec(`UPDATE users SET email=$1 WHERE id=$2`, req.NewEmail, userID)
	if err != nil {
		http.Error(w, "Email update failed", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Email changed"}`))
}

func ChangePhone(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req ChangePhoneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Verify password
	var hashedPassword string
	err = db.DB.QueryRow(`SELECT password FROM users WHERE id=$1`, userID).Scan(&hashedPassword)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password)) != nil {
		http.Error(w, "Invalid password", http.StatusUnauthorized)
		return
	}

	// Update phone
	_, err = db.DB.Exec(`UPDATE users SET phone=$1 WHERE id=$2`, req.NewPhone, userID)
	if err != nil {
		http.Error(w, "Phone update failed", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Phone changed"}`))
}

func DeleteAccount(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req DeleteAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Verify password
	var hashedPassword string
	err = db.DB.QueryRow(`SELECT password FROM users WHERE id=$1`, userID).Scan(&hashedPassword)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password)) != nil {
		http.Error(w, "Invalid password", http.StatusUnauthorized)
		return
	}

	// Delete user (cascade will handle signin_logs)
	_, err = db.DB.Exec(`DELETE FROM users WHERE id=$1`, userID)
	if err != nil {
		http.Error(w, "Account deletion failed", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"Account deleted"}`))
}

// UploadProfilePhoto handles profile photo uploads
func UploadProfilePhoto(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserIDFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse multipart form
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB limit
		http.Error(w, "failed to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("photo")
	if err != nil {
		http.Error(w, "photo is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Ensure uploads directory exists
	uploadDir := "uploads/profiles"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		http.Error(w, "failed to create upload dir", http.StatusInternalServerError)
		return
	}

	// Create safe filename with timestamp
	ts := time.Now().Unix()
	ext := filepath.Ext(header.Filename)
	safeName := fmt.Sprintf("profile_%d_%d%s", userID, ts, ext)
	dstPath := filepath.Join(uploadDir, safeName)

	// Save file
	dst, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, "failed to create file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "failed to save file", http.StatusInternalServerError)
		return
	}

	// Build URL accessible path
	photoURL := fmt.Sprintf("/uploads/profiles/%s", safeName)

	// Update user's profile_pic in database
	_, err = db.DB.Exec(
		`UPDATE users SET profile_pic=$1 WHERE id=$2`,
		photoURL, userID,
	)
	if err != nil {
		http.Error(w, "failed to update profile", http.StatusInternalServerError)
		return
	}

	// Return response
	response := map[string]interface{}{
		"photo_url": photoURL,
		"message":   "Profile photo updated successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
