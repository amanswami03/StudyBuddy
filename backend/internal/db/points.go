package db

import (
	"database/sql"
	"fmt"
	"log"
	"time"
)

// PointsAction represents different actions that earn points
type PointsAction string

const (
	MessageSent      PointsAction = "message_sent"
	MessageReacted   PointsAction = "message_reacted"
	ResourceShared   PointsAction = "resource_shared"
	GroupCreated     PointsAction = "group_created"
	GroupJoined      PointsAction = "group_joined"
	HelpfulMark      PointsAction = "helpful_mark"
	DailyLoginStreak PointsAction = "daily_login_streak"
	InviteFriend     PointsAction = "invite_friend"
)

// PointsWeight defines how many points each action is worth
var PointsWeight = map[PointsAction]int{
	MessageSent:      1,
	MessageReacted:   2,
	ResourceShared:   5,
	GroupCreated:     10,
	GroupJoined:      3,
	HelpfulMark:      10,
	DailyLoginStreak: 5,
	InviteFriend:     15,
}

// AntiSpamLimits defines spam prevention rules
var AntiSpamLimits = map[string]int{
	"max_messages_per_day":      50, // Max points from messages per day
	"max_messages_per_minute":   20, // If >20 msgs in 1 min, ignore
	"min_resource_description":  20, // Min characters for resource description
	"daily_login_streak_points": 20, // Max points for login streak
}

// RankThreshold represents rank progression
type RankThreshold struct {
	RankName     string
	PointsNeeded int
	DisplayOrder int
	BadgeEmoji   string
}

// UserRank represents current user rank info
type UserRank struct {
	UserID         int
	TotalPoints    int
	CurrentRank    string
	LoginStreak    int
	LastLoginDate  sql.NullTime
	LastRankUpdate time.Time
}

// CalculatePoints returns points for an action
func CalculatePoints(action PointsAction) int {
	if points, exists := PointsWeight[action]; exists {
		return points
	}
	return 0
}

// AddPoints adds points to a user's account
func AddPoints(userID int, action PointsAction, details map[string]interface{}) error {
	points := CalculatePoints(action)
	if points == 0 {
		return fmt.Errorf("invalid action: %s", action)
	}

	// Check spam limits based on action
	if action == MessageSent {
		dailyMessagePoints, err := getDailyMessagePoints(userID)
		if err != nil {
			log.Println("Error checking daily message points:", err)
			return err
		}

		// Soft cap: Max 50 points per day for messages
		if dailyMessagePoints >= AntiSpamLimits["max_messages_per_day"] {
			log.Printf("User %d has reached daily message point cap\n", userID)
			return fmt.Errorf("daily message point limit reached")
		}
	}

	// Insert into ledger
	query := `
		INSERT INTO user_points_ledger (user_id, points_change, action_type, action_details)
		VALUES ($1, $2, $3, $4)
	`
	_, err := DB.Exec(query, userID, points, action, details)
	if err != nil {
		return err
	}

	// Update user_ranks total points
	err = updateUserTotalPoints(userID)
	if err != nil {
		return err
	}

	// Update daily activity log
	err = updateDailyActivityLog(userID, action)
	if err != nil {
		return err
	}

	return nil
}

// RemovePoints deducts points for spam/abuse
func RemovePoints(userID int, points int, reason string) error {
	query := `
		INSERT INTO user_points_ledger (user_id, points_change, action_type, action_details)
		VALUES ($1, $2, 'deduction', jsonb_build_object('reason', $3))
	`
	_, err := DB.Exec(query, userID, -points, reason)
	if err != nil {
		return err
	}

	return updateUserTotalPoints(userID)
}

// getDailyMessagePoints gets total message points earned today
func getDailyMessagePoints(userID int) (int, error) {
	query := `
		SELECT COALESCE(SUM(points_change), 0) FROM user_points_ledger
		WHERE user_id = $1 
		AND action_type = $2
		AND DATE(created_at) = CURRENT_DATE
	`
	var points int
	err := DB.QueryRow(query, userID, MessageSent).Scan(&points)
	return points, err
}

// updateUserTotalPoints recalculates total points
func updateUserTotalPoints(userID int) error {
	query := `
		UPDATE user_ranks 
		SET total_points = (
			SELECT COALESCE(SUM(points_change), 0) FROM user_points_ledger
			WHERE user_id = $1
		)
		WHERE user_id = $1
	`
	_, err := DB.Exec(query, userID)
	return err
}

// updateDailyActivityLog tracks daily activity
func updateDailyActivityLog(userID int, action PointsAction) error {
	query := `
		INSERT INTO daily_activity_log (user_id, activity_date, message_count)
		VALUES ($1, CURRENT_DATE, CASE WHEN $2 = 'message_sent' THEN 1 ELSE 0 END)
		ON CONFLICT (user_id, activity_date) 
		DO UPDATE SET 
			message_count = CASE WHEN $2 = 'message_sent' THEN message_count + 1 ELSE message_count END,
			last_updated = NOW()
	`
	_, err := DB.Exec(query, userID, action)
	return err
}

// GetUserRank retrieves user's current rank info
func GetUserRank(userID int) (*UserRank, error) {
	query := `
		SELECT user_id, total_points, current_rank, login_streak, last_login_date, last_rank_update
		FROM user_ranks
		WHERE user_id = $1
	`
	rank := &UserRank{}
	err := DB.QueryRow(query, userID).Scan(
		&rank.UserID,
		&rank.TotalPoints,
		&rank.CurrentRank,
		&rank.LoginStreak,
		&rank.LastLoginDate,
		&rank.LastRankUpdate,
	)

	if err == sql.ErrNoRows {
		// Create entry if doesn't exist
		return createUserRankEntry(userID)
	}
	return rank, err
}

// createUserRankEntry creates a new rank entry for user
func createUserRankEntry(userID int) (*UserRank, error) {
	query := `
		INSERT INTO user_ranks (user_id, total_points, current_rank)
		VALUES ($1, 0, 'Beginner')
		RETURNING user_id, total_points, current_rank, login_streak, last_login_date, last_rank_update
	`
	rank := &UserRank{}
	err := DB.QueryRow(query, userID).Scan(
		&rank.UserID,
		&rank.TotalPoints,
		&rank.CurrentRank,
		&rank.LoginStreak,
		&rank.LastLoginDate,
		&rank.LastRankUpdate,
	)
	return rank, err
}

// GetRankThresholds gets all rank tier requirements
func GetRankThresholds() ([]RankThreshold, error) {
	query := `
		SELECT rank_name, points_required, display_order, badge_emoji
		FROM rank_thresholds
		ORDER BY display_order ASC
	`
	rows, err := DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var thresholds []RankThreshold
	for rows.Next() {
		var t RankThreshold
		if err := rows.Scan(&t.RankName, &t.PointsNeeded, &t.DisplayOrder, &t.BadgeEmoji); err != nil {
			return nil, err
		}
		thresholds = append(thresholds, t)
	}
	return thresholds, rows.Err()
}

// UpdateLoginStreak handles daily login streak
func UpdateLoginStreak(userID int) error {
	query := `
		UPDATE user_ranks 
		SET 
			login_streak = CASE 
				WHEN last_login_date IS NULL THEN 1
				WHEN DATE(last_login_date) = CURRENT_DATE - INTERVAL '1 day' THEN login_streak + 1
				WHEN DATE(last_login_date) = CURRENT_DATE THEN login_streak
				ELSE 1
			END,
			last_login_date = NOW()
		WHERE user_id = $1
		RETURNING login_streak
	`
	var newStreak int
	err := DB.QueryRow(query, userID).Scan(&newStreak)
	if err != nil {
		return err
	}

	// Award login streak points (if streak > 1)
	if newStreak > 1 {
		streakPoints := 5
		if newStreak >= 7 {
			streakPoints = 10
		}
		if newStreak >= 30 {
			streakPoints = 20
		}

		return AddPoints(userID, DailyLoginStreak, map[string]interface{}{
			"streak_days": newStreak,
			"points":      streakPoints,
		})
	}

	return nil
}

// GetLeaderboard returns top users by points
func GetLeaderboard(limit int) ([]map[string]interface{}, error) {
	query := `
		SELECT ur.user_id, u.username, ur.total_points, ur.current_rank
		FROM user_ranks ur
		JOIN users u ON ur.user_id = u.id
		ORDER BY ur.total_points DESC
		LIMIT $1
	`
	rows, err := DB.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var leaderboard []map[string]interface{}
	for rows.Next() {
		var userID int
		var username, rank string
		var points int

		if err := rows.Scan(&userID, &username, &points, &rank); err != nil {
			return nil, err
		}

		leaderboard = append(leaderboard, map[string]interface{}{
			"user_id":      userID,
			"username":     username,
			"total_points": points,
			"current_rank": rank,
		})
	}
	return leaderboard, rows.Err()
}

// InitializeUserPoints creates initial points entry for new user
func InitializeUserPoints(userID int) error {
	// Create user_ranks entry
	query := `
		INSERT INTO user_ranks (user_id, total_points, current_rank)
		VALUES ($1, 0, 'Beginner')
	`
	_, err := DB.Exec(query, userID)
	if err != nil {
		return err
	}

	// Award initial signup points
	return AddPoints(userID, InviteFriend, map[string]interface{}{
		"action": "account_creation",
		"points": 15,
	})
}
