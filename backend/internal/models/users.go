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
	Bio                  *string    `json:"bio,omitempty" db:"bio"`
	Phone                *string    `json:"phone,omitempty" db:"phone"`
	Location             *string    `json:"location,omitempty" db:"location"`
	University           *string    `json:"university,omitempty" db:"university"`
	Major                *string    `json:"major,omitempty" db:"major"`
	LastSeen             *time.Time `json:"last_seen,omitempty" db:"last_seen"`
	IsOnline             bool       `json:"is_online" db:"is_online"`
	ShowLastSeen         bool       `json:"show_last_seen" db:"show_last_seen"`
	ShowOnline           bool       `json:"show_online" db:"show_online"`
	NotificationsEnabled bool       `json:"notifications_enabled" db:"notifications_enabled"`
	ShowEmail            bool       `json:"show_email" db:"show_email"`
	ShowPhone            bool       `json:"show_phone" db:"show_phone"`
	ShowLocation         bool       `json:"show_location" db:"show_location"`
	ShowUniversity       bool       `json:"show_university" db:"show_university"`
	ShowBio              bool       `json:"show_bio" db:"show_bio"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
}
