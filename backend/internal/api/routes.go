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
	r.HandleFunc("/api/profile/password", handlers.ChangePassword).Methods("PUT")
	r.HandleFunc("/api/profile/delete", handlers.DeleteAccount).Methods("DELETE")
	r.HandleFunc("/api/user/profile-photo", handlers.UploadProfilePhoto).Methods("POST")
	
	// User routes - use subrouter to avoid conflicts
	userRouter := r.PathPrefix("/api/users").Subrouter()
	userRouter.HandleFunc("/{id:[0-9]+}/stats", handlers.GetUserStatsPublic).Methods("GET")
	userRouter.HandleFunc("/{id:[0-9]+}/activity", handlers.GetUserActivityStatsPublic).Methods("GET")
	userRouter.HandleFunc("/{id:[0-9]+}", handlers.GetPublicProfile).Methods("GET")

	r.HandleFunc("/api/groups/{id:[0-9]+}/messages", handlers.GetGroupMessages).Methods("GET")
	r.HandleFunc("/api/groups/{id:[0-9]+}/messages", handlers.PostGroupMessage).Methods("POST")
	r.HandleFunc("/api/groups/{id:[0-9]+}/messages/upload", handlers.UploadMessage).Methods("POST")
	r.HandleFunc("/ws", handlers.WsHandler).Methods("GET")

	// Groups
	r.HandleFunc("/api/groups", handlers.ListGroups).Methods("GET")
	r.HandleFunc("/api/groups/search", handlers.SearchGroups).Methods("GET")
	r.HandleFunc("/api/user/groups", handlers.GetMyGroups).Methods("GET")
	r.HandleFunc("/api/groups", handlers.CreateGroup).Methods("POST")
	r.HandleFunc("/api/groups/{id:[0-9]+}", handlers.GetGroup).Methods("GET")
	r.HandleFunc("/api/groups/{id:[0-9]+}", handlers.UpdateGroup).Methods("PUT")
	r.HandleFunc("/api/groups/{id:[0-9]+}", handlers.DeleteGroup).Methods("DELETE")
	r.HandleFunc("/api/groups/{id:[0-9]+}/join", handlers.JoinGroup).Methods("POST")
	r.HandleFunc("/api/groups/{id:[0-9]+}/leave", handlers.LeaveGroup).Methods("POST")
	r.HandleFunc("/api/groups/{id:[0-9]+}/members", handlers.GetGroupMembers).Methods("GET")
	r.HandleFunc("/api/groups/{id:[0-9]+}/members/{userId:[0-9]+}/remove", handlers.RemoveGroupMember).Methods("POST")
	r.HandleFunc("/api/groups/{id:[0-9]+}/members/{userId:[0-9]+}/make-admin", handlers.MakeGroupAdmin).Methods("POST")
	r.HandleFunc("/api/groups/{id:[0-9]+}/members/{userId:[0-9]+}/remove-admin", handlers.RemoveGroupAdmin).Methods("POST")
	r.HandleFunc("/api/groups/{id:[0-9]+}/can-view-content", handlers.CanViewContent).Methods("GET")
	r.HandleFunc("/api/groups/{id:[0-9]+}/join-requests", handlers.GetJoinRequests).Methods("GET")
	r.HandleFunc("/api/groups/{id:[0-9]+}/join-requests/{requestId:[0-9]+}/approve", handlers.ApproveJoinRequest).Methods("POST")
	r.HandleFunc("/api/groups/{id:[0-9]+}/join-requests/{requestId:[0-9]+}/reject", handlers.RejectJoinRequest).Methods("POST")

	// Points & Ranking
	r.HandleFunc("/api/user/stats", handlers.GetUserStats).Methods("GET")
	r.HandleFunc("/api/user/activity", handlers.GetUserActivityStats).Methods("GET")
	r.HandleFunc("/api/leaderboard", handlers.GetLeaderboard).Methods("GET")
	r.HandleFunc("/api/ranks", handlers.GetRankThresholds).Methods("GET")
	r.HandleFunc("/api/messages/reaction", handlers.AddMessageReaction).Methods("POST")
	r.HandleFunc("/api/user/points-history", handlers.GetUserPointsHistory).Methods("GET")

	// Notifications
	r.HandleFunc("/api/user/notifications", handlers.GetUserNotifications).Methods("GET")
	r.HandleFunc("/api/user/notifications/read", handlers.MarkNotificationAsRead).Methods("POST")
	r.HandleFunc("/api/user/notifications/unread-count", handlers.GetUnreadNotificationCount).Methods("GET")

	// Study Sessions
	r.HandleFunc("/api/study/start", handlers.StartStudySession).Methods("POST")
	r.HandleFunc("/api/study/end", handlers.EndStudySession).Methods("POST")
	r.HandleFunc("/api/study/sessions", handlers.GetUserStudySessions).Methods("GET")
	r.HandleFunc("/api/study/stats", handlers.GetStudyStats).Methods("GET")

	// User upcoming sessions - must be before group sessions routes
	r.HandleFunc("/api/user/upcoming-sessions", handlers.GetUserUpcomingSessions).Methods("GET")

	// Scheduled Group Sessions
	r.HandleFunc("/api/groups/{id:[0-9]+}/sessions", handlers.GetGroupSessions).Methods("GET")
	r.HandleFunc("/api/groups/{id:[0-9]+}/sessions/create", handlers.CreateGroupSession).Methods("POST")
	r.HandleFunc("/api/groups/sessions/{id:[0-9]+}", handlers.GetGroupSession).Methods("GET")
	r.HandleFunc("/api/groups/sessions/{id:[0-9]+}", handlers.DeleteGroupSession).Methods("DELETE")
	r.HandleFunc("/api/groups/sessions/{id:[0-9]+}/join", handlers.JoinSession).Methods("POST")
	r.HandleFunc("/api/groups/sessions/{id:[0-9]+}/vote", handlers.VoteForSessionTime).Methods("POST")
	r.HandleFunc("/api/groups/sessions/{id:[0-9]+}/attendees", handlers.GetSessionAttendees).Methods("GET")

	// Group Resources
	r.HandleFunc("/api/groups/{id:[0-9]+}/resources", handlers.GetGroupResources).Methods("GET")
	r.HandleFunc("/api/groups/{id:[0-9]+}/resources/upload", handlers.UploadGroupResource).Methods("POST")
	r.HandleFunc("/api/resources/{resourceId:[0-9]+}/download", handlers.DownloadGroupResource).Methods("GET")
	r.HandleFunc("/api/resources/{resourceId:[0-9]+}", handlers.DeleteGroupResource).Methods("DELETE")

	r.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("API running 🚀"))
	}).Methods("GET")
}
