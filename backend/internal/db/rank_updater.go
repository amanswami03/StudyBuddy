package db

import (
	"fmt"
	"log"
)

// RankUpdateJob runs daily to recalculate ranks
// Should be called once per day via scheduler (e.g., 00:01 UTC)
func RankUpdateJob() error {
	log.Println("🔄 Starting daily rank update job...")

	// Get all users
	query := `SELECT user_id FROM user_ranks`
	rows, err := DB.Query(query)
	if err != nil {
		return err
	}
	defer rows.Close()

	var userIDs []int
	for rows.Next() {
		var userID int
		if err := rows.Scan(&userID); err != nil {
			return err
		}
		userIDs = append(userIDs, userID)
	}

	// Update each user's rank
	updateCount := 0
	for _, userID := range userIDs {
		if updated, err := UpdateUserRank(userID); err != nil {
			log.Printf("Error updating rank for user %d: %v\n", userID, err)
		} else if updated {
			updateCount++
		}
	}

	log.Printf("✅ Rank update complete. %d users updated.\n", updateCount)
	return nil
}

// UpdateUserRank recalculates user's rank based on total points
// Returns true if rank changed, false otherwise
func UpdateUserRank(userID int) (bool, error) {
	// Get current total points
	var totalPoints int
	query := `SELECT total_points FROM user_ranks WHERE user_id = $1`
	err := DB.QueryRow(query, userID).Scan(&totalPoints)
	if err != nil {
		return false, err
	}

	// Get new rank based on points
	newRank, err := GetRankByPoints(totalPoints)
	if err != nil {
		return false, err
	}

	// Get current rank
	var currentRank string
	query = `SELECT current_rank FROM user_ranks WHERE user_id = $1`
	err = DB.QueryRow(query, userID).Scan(&currentRank)
	if err != nil {
		return false, err
	}

	// If rank changed, update it
	if newRank != currentRank {
		query = `
			UPDATE user_ranks 
			SET current_rank = $1, last_rank_update = NOW()
			WHERE user_id = $2
		`
		_, err = DB.Exec(query, newRank, userID)
		if err != nil {
			return false, err
		}

		log.Printf("🎉 User %d promoted to %s (Points: %d)\n", userID, newRank, totalPoints)
		return true, nil
	}

	return false, nil
}

// GetRankByPoints determines rank based on total points
func GetRankByPoints(totalPoints int) (string, error) {
	query := `
		SELECT rank_name 
		FROM rank_thresholds
		WHERE points_required <= $1
		ORDER BY points_required DESC
		LIMIT 1
	`
	var rank string
	err := DB.QueryRow(query, totalPoints).Scan(&rank)
	if err != nil {
		// Default to Beginner if no rank found
		return "Beginner", nil
	}
	return rank, nil
}

// DetectAndPunishSpam checks for spam patterns and deducts points
func DetectAndPunishSpam() error {
	log.Println("🚨 Starting spam detection job...")

	// Rule 1: Detect users with many messages but no reactions (potential spammers)
	query := `
		SELECT user_id, message_count 
		FROM daily_activity_log
		WHERE activity_date = CURRENT_DATE
		AND message_count > 50
		AND messages_with_reactions < (message_count * 0.1)  -- Less than 10% reaction rate
	`

	rows, err := DB.Query(query)
	if err != nil {
		return err
	}
	defer rows.Close()

	punishmentCount := 0
	for rows.Next() {
		var userID, messageCount int
		if err := rows.Scan(&userID, &messageCount); err != nil {
			return err
		}

		// Deduct 20% of daily message points as penalty
		penaltyPoints := messageCount / 5
		if penaltyPoints > 10 {
			penaltyPoints = 10
		}

		reason := fmt.Sprintf("Spam detection: %d messages with low engagement", messageCount)
		if err := RemovePoints(userID, penaltyPoints, reason); err != nil {
			log.Printf("Error penalizing user %d: %v\n", userID, err)
		} else {
			punishmentCount++
			log.Printf("⚠️ Penalized user %d for spam: -%d points\n", userID, penaltyPoints)
		}
	}

	log.Printf("✅ Spam detection complete. %d users penalized.\n", punishmentCount)
	return nil
}

// ScheduleRankUpdates would be called in main.go to run jobs daily
// Example using robfig/cron:
/*
func ScheduleRankUpdates() {
	c := cron.New()

	// Run rank update at 00:01 UTC daily
	c.AddFunc("1 0 * * *", func() {
		if err := RankUpdateJob(); err != nil {
			log.Printf("Rank update job failed: %v\n", err)
		}
	})

	// Run spam detection at 23:50 UTC daily
	c.AddFunc("50 23 * * *", func() {
		if err := DetectAndPunishSpam(); err != nil {
			log.Printf("Spam detection job failed: %v\n", err)
		}
	})

	c.Start()
}
*/
