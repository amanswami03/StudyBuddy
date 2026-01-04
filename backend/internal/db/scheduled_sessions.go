package db

import (
	"database/sql"
	"time"
)

// ScheduledGroupSession represents a session scheduled for a group
type ScheduledGroupSession struct {
	ID               int       `json:"id"`
	GroupID          int       `json:"group_id"`
	CreatedBy        int       `json:"created_by"`
	CreatedByName    string    `json:"created_by_name,omitempty"`
	Title            string    `json:"title"`
	Description      string    `json:"description"`
	ScheduledTime    time.Time `json:"scheduled_time"`
	DurationMinutes  int       `json:"duration_minutes"`
	MaxAttendees     *int      `json:"max_attendees,omitempty"`
	Status           string    `json:"status"`
	VotingEnabled    bool      `json:"voting_enabled"`
	AttendeeCount    int       `json:"attendee_count"`
	VotingOptions    []VotingOption `json:"voting_options,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// VotingOption represents a time option for voting
type VotingOption struct {
	ID       int       `json:"id"`
	Time     time.Time `json:"time"`
	Votes    int       `json:"votes"`
	UserVoted bool     `json:"user_voted,omitempty"`
}

// CreateGroupSession creates a new scheduled session for a group
func CreateGroupSession(groupID int, createdBy int, title string, description string, scheduledTime time.Time, durationMinutes int, votingEnabled bool) (int, error) {
	var sessionID int
	err := DB.QueryRow(`
		INSERT INTO scheduled_group_sessions 
		(group_id, created_by, title, description, scheduled_time, duration_minutes, voting_enabled, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')
		RETURNING id
	`, groupID, createdBy, title, description, scheduledTime, durationMinutes, votingEnabled).Scan(&sessionID)
	
	if err != nil {
		return 0, err
	}
	return sessionID, nil
}

// GetGroupSessions retrieves all sessions for a group with user's voting status
func GetGroupSessions(groupID int, userID int) ([]ScheduledGroupSession, error) {
	rows, err := DB.Query(`
		SELECT 
			s.id, s.group_id, s.created_by, u.username, s.title, s.description, 
			s.scheduled_time, s.duration_minutes, s.max_attendees, s.status, s.voting_enabled,
			COUNT(DISTINCT sa.id) as attendee_count, s.created_at, s.updated_at
		FROM scheduled_group_sessions s
		LEFT JOIN users u ON s.created_by = u.id
		LEFT JOIN session_attendees sa ON s.id = sa.session_id
		WHERE s.group_id = $1
		GROUP BY s.id, u.username
		ORDER BY s.scheduled_time DESC
	`, groupID)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var sessions []ScheduledGroupSession
	for rows.Next() {
		var session ScheduledGroupSession
		err := rows.Scan(
			&session.ID, &session.GroupID, &session.CreatedBy, &session.CreatedByName,
			&session.Title, &session.Description, &session.ScheduledTime, &session.DurationMinutes,
			&session.MaxAttendees, &session.Status, &session.VotingEnabled,
			&session.AttendeeCount, &session.CreatedAt, &session.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		
		// Get voting options if voting is enabled
		if session.VotingEnabled {
			votingOptions, err := getVotingOptions(session.ID, userID)
			if err == nil {
				session.VotingOptions = votingOptions
			}
		}
		
		sessions = append(sessions, session)
	}
	
	return sessions, rows.Err()
}

// GetGroupSession retrieves a single session by ID with user's voting status
func GetGroupSession(sessionID int, userID int) (*ScheduledGroupSession, error) {
	var session ScheduledGroupSession
	err := DB.QueryRow(`
		SELECT 
			s.id, s.group_id, s.created_by, u.username, s.title, s.description, 
			s.scheduled_time, s.duration_minutes, s.max_attendees, s.status, s.voting_enabled,
			COUNT(DISTINCT sa.id) as attendee_count, s.created_at, s.updated_at
		FROM scheduled_group_sessions s
		LEFT JOIN users u ON s.created_by = u.id
		LEFT JOIN session_attendees sa ON s.id = sa.session_id
		WHERE s.id = $1
		GROUP BY s.id, u.username
	`, sessionID).Scan(
		&session.ID, &session.GroupID, &session.CreatedBy, &session.CreatedByName,
		&session.Title, &session.Description, &session.ScheduledTime, &session.DurationMinutes,
		&session.MaxAttendees, &session.Status, &session.VotingEnabled,
		&session.AttendeeCount, &session.CreatedAt, &session.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	
	// Get voting options if voting is enabled
	if session.VotingEnabled {
		votingOptions, err := getVotingOptions(sessionID, userID)
		if err == nil {
			session.VotingOptions = votingOptions
		}
	}
	
	return &session, nil
}

// getVotingOptions retrieves voting options for a session with user's voting status
func getVotingOptions(sessionID int, userID int) ([]VotingOption, error) {
	rows, err := DB.Query(`
		SELECT 
			vo.id, vo.option_time, vo.vote_count,
			CASE WHEN suv.user_id = $2 THEN true ELSE false END as user_voted
		FROM session_voting_options vo
		LEFT JOIN session_user_votes suv ON vo.id = suv.voting_option_id AND suv.user_id = $2
		WHERE vo.session_id = $1
		ORDER BY vo.option_time ASC
	`, sessionID, userID)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var options []VotingOption
	for rows.Next() {
		var option VotingOption
		err := rows.Scan(&option.ID, &option.Time, &option.Votes, &option.UserVoted)
		if err != nil {
			return nil, err
		}
		options = append(options, option)
	}
	
	return options, rows.Err()
}

// AddVotingOption adds a time option for voting on a session
func AddVotingOption(sessionID int, optionTime time.Time) (int, error) {
	var optionID int
	err := DB.QueryRow(`
		INSERT INTO session_voting_options (session_id, option_time)
		VALUES ($1, $2)
		RETURNING id
	`, sessionID, optionTime).Scan(&optionID)
	
	return optionID, err
}

// UserVoteForOption records a user's vote for a session time option with toggle behavior
func UserVoteForOption(sessionID int, userID int, votingOptionID int) error {
	// First, check if user already has a vote for this session
	var existingVoteOptionID int
	err := DB.QueryRow(`
		SELECT voting_option_id FROM session_user_votes 
		WHERE session_id=$1 AND user_id=$2
	`, sessionID, userID).Scan(&existingVoteOptionID)
	
	if err == nil {
		// User has an existing vote
		if existingVoteOptionID == votingOptionID {
			// Voting for the same option again = remove vote (toggle off)
			_, err := DB.Exec(`
				DELETE FROM session_user_votes 
				WHERE session_id=$1 AND user_id=$2
			`, sessionID, userID)
			if err == nil {
				// Decrement vote count for this option
				DB.Exec(`
					UPDATE session_voting_options 
					SET vote_count = GREATEST(vote_count - 1, 0)
					WHERE id = $1
				`, votingOptionID)
			}
			return err
		} else {
			// Voting for a different option = change vote
			// Decrement old vote count
			DB.Exec(`
				UPDATE session_voting_options 
				SET vote_count = GREATEST(vote_count - 1, 0)
				WHERE id = $1
			`, existingVoteOptionID)
			
			// Update to new option
			_, err := DB.Exec(`
				UPDATE session_user_votes 
				SET voting_option_id = $1, voted_at = NOW()
				WHERE session_id = $2 AND user_id = $3
			`, votingOptionID, sessionID, userID)
			
			if err == nil {
				// Increment new vote count
				DB.Exec(`
					UPDATE session_voting_options 
					SET vote_count = vote_count + 1
					WHERE id = $1
				`, votingOptionID)
			}
			return err
		}
	} else if err.Error() == "sql: no rows in result set" {
		// User has no existing vote, insert new vote
		_, err := DB.Exec(`
			INSERT INTO session_user_votes (session_id, user_id, voting_option_id)
			VALUES ($1, $2, $3)
		`, sessionID, userID, votingOptionID)
		
		if err == nil {
			// Increment vote count for this option
			DB.Exec(`
				UPDATE session_voting_options 
				SET vote_count = vote_count + 1
				WHERE id = $1
			`, votingOptionID)
		}
		return err
	}
	
	return err
}

// AddSessionAttendee marks a user as attending a session
func AddSessionAttendee(sessionID int, userID int, status string) error {
	_, err := DB.Exec(`
		INSERT INTO session_attendees (session_id, user_id, status)
		VALUES ($1, $2, $3)
		ON CONFLICT (session_id, user_id)
		DO UPDATE SET status = $3
	`, sessionID, userID, status)
	return err
}

// GetSessionAttendees retrieves all attendees for a session
func GetSessionAttendees(sessionID int) ([]struct {
	UserID   int
	Username string
	Status   string
}, error) {
	rows, err := DB.Query(`
		SELECT u.id, u.username, sa.status
		FROM session_attendees sa
		JOIN users u ON sa.user_id = u.id
		WHERE sa.session_id = $1
		ORDER BY sa.joined_at ASC
	`, sessionID)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var attendees []struct {
		UserID   int
		Username string
		Status   string
	}
	
	for rows.Next() {
		var attendee struct {
			UserID   int
			Username string
			Status   string
		}
		err := rows.Scan(&attendee.UserID, &attendee.Username, &attendee.Status)
		if err != nil {
			return nil, err
		}
		attendees = append(attendees, attendee)
	}
	
	return attendees, rows.Err()
}

// UpdateSessionStatus updates the status of a session
func UpdateSessionStatus(sessionID int, status string) error {
	_, err := DB.Exec(`
		UPDATE scheduled_group_sessions
		SET status = $1, updated_at = NOW()
		WHERE id = $2
	`, status, sessionID)
	return err
}

// DeleteGroupSession deletes a scheduled session
func DeleteGroupSession(sessionID int) error {
	_, err := DB.Exec(`
		DELETE FROM scheduled_group_sessions
		WHERE id = $1
	`, sessionID)
	return err
}
// GetUserUpcomingSessions gets all upcoming sessions for a user across all groups they're part of
func GetUserUpcomingSessions(userID int) ([]ScheduledGroupSession, error) {
	rows, err := DB.Query(`
		SELECT
			s.id, s.group_id, s.created_by, COALESCE(u.username, 'Unknown'), s.title, s.description,
			s.scheduled_time, s.duration_minutes, s.max_attendees, s.status,
			s.voting_enabled, s.created_at, s.updated_at,
			COALESCE((SELECT COUNT(*) FROM session_attendees WHERE session_id = s.id), 0) as attendee_count
		FROM scheduled_group_sessions s
		JOIN group_members gm ON s.group_id = gm.group_id
		LEFT JOIN users u ON s.created_by = u.id
		WHERE gm.user_id = $1
		AND s.scheduled_time >= NOW()
		AND s.status != 'cancelled'
		ORDER BY s.scheduled_time ASC
	`, userID)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var sessions []ScheduledGroupSession
	for rows.Next() {
		var session ScheduledGroupSession
		var maxAttendees sql.NullInt64
		err := rows.Scan(
			&session.ID, &session.GroupID, &session.CreatedBy, &session.CreatedByName,
			&session.Title, &session.Description, &session.ScheduledTime, &session.DurationMinutes,
			&maxAttendees, &session.Status, &session.VotingEnabled, &session.CreatedAt, &session.UpdatedAt,
			&session.AttendeeCount,
		)
		if err != nil {
			return nil, err
		}
		
		if maxAttendees.Valid {
			maxAttendees := int(maxAttendees.Int64)
			session.MaxAttendees = &maxAttendees
		}
		
		sessions = append(sessions, session)
	}
	
	if sessions == nil {
		sessions = make([]ScheduledGroupSession, 0)
	}
	
	return sessions, nil
}