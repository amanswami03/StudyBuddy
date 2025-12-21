package ws

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var jwtSecret = []byte("supersecretkey") // same as in auth.go

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // allow all origins for dev
	},
}

func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	groupID := mux.Vars(r)["groupID"]

	// Extract user ID from token (query param or header)
	var userID int
	token := r.URL.Query().Get("token")
	if token == "" {
		auth := r.Header.Get("Authorization")
		if strings.HasPrefix(auth, "Bearer ") {
			token = auth[7:]
		}
	}

	if token != "" {
		// Parse JWT to get user_id
		t, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return jwtSecret, nil
		})
		if err == nil && t.Valid {
			if claims, ok := t.Claims.(jwt.MapClaims); ok {
				if uidRaw, ok := claims["user_id"]; ok {
					switch v := uidRaw.(type) {
					case float64:
						userID = int(v)
					case int:
						userID = v
					}
				}
			}
		}
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open websocket", http.StatusBadRequest)
		return
	}
	client := &Client{
		Hub:     hub,
		Conn:    conn,
		Send:    make(chan []byte, 256),
		GroupID: groupID,
		UserID:  userID,
	}
	hub.Register <- client

	go client.WritePump()
	go client.ReadPump(nil)
}
