package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"studybuddy/internal/db"
	"studybuddy/internal/ws"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// allow CORS during dev - lock down in prod
	CheckOrigin: func(r *http.Request) bool { return true },
}

type WSMessage struct {
	GroupID    int    `json:"group_id"`
	SenderID   int    `json:"sender_id"`
	SenderName string `json:"sender_name"`
	Content    string `json:"content"`
	CreatedAt  string `json:"created_at,omitempty"`
}

func WsHandler(w http.ResponseWriter, r *http.Request) {
	// Expect query params: ?group=123&token=<jwt>
	groupStr := r.URL.Query().Get("group")
	tokenStr := r.URL.Query().Get("token")
	if groupStr == "" || tokenStr == "" {
		http.Error(w, "missing group or token", http.StatusBadRequest)
		return
	}
	groupID, err := strconv.Atoi(groupStr)
	if err != nil {
		http.Error(w, "invalid group id", http.StatusBadRequest)
		return
	}

	// Validate token and get user id
	uid, err := GetUserIDFromToken(tokenStr)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	// Optional: check if user is member of group. For public groups you may skip.
	var exists bool
	_ = db.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2)`, groupID, uid).Scan(&exists)
	if !exists {
		// For public groups you can add the user as a member automatically:
		_, _ = db.DB.Exec(`INSERT INTO group_members (group_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, groupID, uid)
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	hub := ws.GetHub(groupID)
	client := &ws.Client{
		Hub:     hub,
		Conn:    conn,
		Send:    make(chan []byte, 256),
		GroupID: strconv.Itoa(groupID),
	}
	hub.Register <- client

	// handle messages - when client writes, persist and broadcast
	onMessage := func(msgBytes []byte) {
		var m WSMessage
		if err := json.Unmarshal(msgBytes, &m); err != nil {
			return
		}
		// populate fields (trust sender id from token instead of client)
		m.GroupID = groupID
		m.SenderID = uid

		// fetch sender name
		var senderName string
		dbErr := db.DB.QueryRow(`SELECT username FROM users WHERE id=$1`, uid).Scan(&senderName)
		if dbErr != nil || senderName == "" {
			// fallback to email if username not found
			_ = db.DB.QueryRow(`SELECT email FROM users WHERE id=$1`, uid).Scan(&senderName)
		}
		if senderName == "" {
			senderName = "User" // final fallback
		}
		m.SenderName = senderName

		// persist message in DB - ALWAYS use UTC
		now := time.Now().UTC()
		_, err := db.DB.Exec(
			`INSERT INTO messages (group_id, sender_id, sender_name, content, created_at, message_type) VALUES ($1,$2,$3,$4,$5,$6)`,
			m.GroupID, m.SenderID, m.SenderName, m.Content, now, "text",
		)
		if err != nil {
			// log but continue to broadcast
			fmt.Println("failed to save message:", err)
		}
		m.CreatedAt = now.Format(time.RFC3339)

		// Explicitly build response to ensure all fields are included
		response := map[string]interface{}{
			"group_id":    m.GroupID,
			"sender_id":   m.SenderID,
			"sender_name": m.SenderName,
			"content":     m.Content,
			"created_at":  m.CreatedAt,
		}

		// marshal and broadcast to hub
		out, _ := json.Marshal(response)
		fmt.Printf("Broadcasting message: %s\n", string(out)) // DEBUG
		hub.Broadcast <- ws.Message{
			GroupID: strconv.Itoa(groupID),
			Data:    out,
		}
	}

	// start pumps
	go client.WritePump()
	go client.ReadPump(onMessage)
}
