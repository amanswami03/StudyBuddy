package models

import (
	"time"
)

type User struct {
	ID                   int        `json:"id" db:"id"`
	Username             string     `json:"username" db:"username"`
	Email                string     `json:"email" db:"email"`
	Password             string     `json:"-" db:"password"` // hashed
	ProfilePic           *string    `json:"profile_pic,omitempty" db:"profile_pic"`
	LastSeen             *time.Time `json:"last_seen,omitempty" db:"last_seen"`
	IsOnline             bool       `json:"is_online" db:"is_online"`
	ShowLastSeen         bool       `json:"show_last_seen" db:"show_last_seen"`
	ShowOnline           bool       `json:"show_online" db:"show_online"`
	Phone                *string    `json:"phone,omitempty" db:"phone"`
	NotificationsEnabled bool       `json:"notifications_enabled" db:"notifications_enabled"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
}
