package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"studybuddy/internal/api"
	"studybuddy/internal/db"
	"studybuddy/internal/handlers"
	"studybuddy/internal/models"
	"studybuddy/internal/ws"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	db.Init()

	hub := ws.NewHub()
	go hub.Run()

	// Set the global hub reference so handlers can broadcast
	handlers.GlobalHub = hub

	r := mux.NewRouter()
	api.RegisterRoutes(r)

	// serve uploaded files from ./uploads under /uploads/
	r.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads/"))))

	r.HandleFunc("/ws/{groupID}", func(w http.ResponseWriter, r *http.Request) {
		ws.ServeWS(hub, w, r)
	})

	// Enable CORS
	c := cors.New(cors.Options{
		// allow both common vite dev ports (5173 and 5174) during development
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:5174"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	hub.SaveMessageFunc = func(msg ws.Message) error {
		// Try to parse as JSON (new format with { content: "..." })
		var msgObj map[string]interface{}
		var content string

		if err := json.Unmarshal(msg.Data, &msgObj); err == nil && msgObj["content"] != nil {
			// New JSON format
			if c, ok := msgObj["content"].(string); ok {
				content = c
			}
		} else {
			// Fallback: try old "Sender: content" format (won't work well but keep for compat)
			parts := strings.SplitN(string(msg.Data), ": ", 2)
			if len(parts) != 2 {
				return nil
			}
			content = parts[1]
		}

		// Fetch sender name
		var senderName string
		err := db.DB.QueryRow(`SELECT username FROM users WHERE id=$1`, msg.UserID).Scan(&senderName)
		if err != nil || senderName == "" {
			_ = db.DB.QueryRow(`SELECT email FROM users WHERE id=$1`, msg.UserID).Scan(&senderName)
		}
		if senderName == "" {
			senderName = "User"
		}

		return db.SaveMessage(db.DB, models.Message{
			GroupID:   msg.GroupID,
			SenderID:  msg.UserID,
			SenderName: senderName,
			Content:   content,
		})
	}

	handler := c.Handler(r)

	fmt.Println("Server started on :8080")
	http.ListenAndServe(":8080", handler)
}
