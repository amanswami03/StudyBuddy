package api

import (
	"net/http"
	"studybuddy/internal/handlers"

	"github.com/gorilla/mux"
)

func RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/api/signup", handlers.Signup).Methods("POST")
	r.HandleFunc("/api/login", handlers.Login).Methods("POST")

	// Profile routes
	r.HandleFunc("/api/profile", handlers.GetProfile).Methods("GET")
	r.HandleFunc("/api/profile", handlers.UpdateProfile).Methods("PUT")
	r.HandleFunc("/api/profile/email", handlers.ChangeEmail).Methods("PUT")
	r.HandleFunc("/api/profile/phone", handlers.ChangePhone).Methods("PUT")
	r.HandleFunc("/api/profile/delete", handlers.DeleteAccount).Methods("DELETE")
	r.HandleFunc("/api/user/profile-photo", handlers.UploadProfilePhoto).Methods("POST")
	r.HandleFunc("/api/users/{id:[0-9]+}", handlers.GetPublicProfile).Methods("GET")

	r.HandleFunc("/api/groups/{id:[0-9]+}/messages", handlers.GetGroupMessages).Methods("GET")
	r.HandleFunc("/api/groups/{id:[0-9]+}/messages", handlers.PostGroupMessage).Methods("POST")
	r.HandleFunc("/api/groups/{id:[0-9]+}/messages/upload", handlers.UploadMessage).Methods("POST")
	r.HandleFunc("/ws", handlers.WsHandler).Methods("GET")

	// Groups
	r.HandleFunc("/api/groups", handlers.ListGroups).Methods("GET")
	r.HandleFunc("/api/user/groups", handlers.GetMyGroups).Methods("GET")
	r.HandleFunc("/api/groups", handlers.CreateGroup).Methods("POST")
	r.HandleFunc("/api/groups/{id:[0-9]+}", handlers.GetGroup).Methods("GET")
	r.HandleFunc("/api/groups/{id:[0-9]+}/join", handlers.JoinGroup).Methods("POST")
	r.HandleFunc("/api/groups/{id:[0-9]+}/leave", handlers.LeaveGroup).Methods("POST")

	// Points & Ranking
	r.HandleFunc("/api/user/stats", handlers.GetUserStats).Methods("GET")
	r.HandleFunc("/api/user/activity", handlers.GetUserActivityStats).Methods("GET")
	r.HandleFunc("/api/leaderboard", handlers.GetLeaderboard).Methods("GET")
	r.HandleFunc("/api/ranks", handlers.GetRankThresholds).Methods("GET")
	r.HandleFunc("/api/messages/reaction", handlers.AddMessageReaction).Methods("POST")
	r.HandleFunc("/api/user/points-history", handlers.GetUserPointsHistory).Methods("GET")

	// Study Sessions
	r.HandleFunc("/api/study/start", handlers.StartStudySession).Methods("POST")
	r.HandleFunc("/api/study/end", handlers.EndStudySession).Methods("POST")
	r.HandleFunc("/api/study/sessions", handlers.GetUserStudySessions).Methods("GET")
	r.HandleFunc("/api/study/stats", handlers.GetStudyStats).Methods("GET")

	r.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("API running 🚀"))
	}).Methods("GET")
}
