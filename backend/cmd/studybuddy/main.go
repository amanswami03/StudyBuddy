package main

import (
	"fmt"
	"net/http"
	"strings"

	"studybuddy/internal/api"
	"studybuddy/internal/db"
	"studybuddy/internal/models"
	"studybuddy/internal/ws"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	db.Init()

	hub := ws.NewHub()
	go hub.Run()

	r := mux.NewRouter()
	api.RegisterRoutes(r)

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
		parts := strings.SplitN(string(msg.Data), ": ", 2)
		if len(parts) != 2 {
			return nil
		}
		sender := parts[0]
		content := parts[1]
		return db.SaveMessage(db.DB, models.Message{
			GroupID: msg.GroupID,
			Sender:  sender,
			Content: content,
		})
	}

	handler := c.Handler(r)

	fmt.Println("Server started on :8080")
	http.ListenAndServe(":8080", handler)
}
