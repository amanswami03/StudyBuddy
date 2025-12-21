package models

import (
	"time"
)

type Message struct {
	ID        int64     `json:"id" db:"id"`
	GroupID   string    `json:"group_id" db:"group_id"`
	SenderID  int       `json:"sender_id" db:"sender_id"`
	Sender    string    `json:"sender" db:"sender"`
	Content   string    `json:"content" db:"content"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
