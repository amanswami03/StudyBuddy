package models

import "time"

type Group struct {
	ID                          int       `json:"id" db:"id"`
	Name                        string    `json:"name" db:"name"`
	Username                    string    `json:"username" db:"username"`
	Description                 string    `json:"description" db:"description"`
	CreatedBy                   int       `json:"created_by" db:"created_by"`
	IsPublic                    bool      `json:"is_public" db:"is_public"`
	AllowContentViewWithoutJoin bool      `json:"allow_content_view_without_join" db:"allow_content_view_without_join"`
	RequireAdminApproval        bool      `json:"require_admin_approval" db:"require_admin_approval"`
	CreatedAt                   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt                   time.Time `json:"updated_at" db:"updated_at"`
}

type GroupMember struct {
	ID       int       `json:"id" db:"id"`
	GroupID  int       `json:"group_id" db:"group_id"`
	UserID   int       `json:"user_id" db:"user_id"`
	Username string    `json:"username" db:"username"`
	Role     string    `json:"role" db:"role"` // 'admin', 'member'
	JoinedAt time.Time `json:"joined_at" db:"joined_at"`
}

type GroupPermissions struct {
	IsAdmin                bool `json:"is_admin"`
	CanRemoveMembers       bool `json:"can_remove_members"`
	CanMakeAdmin           bool `json:"can_make_admin"`
	CanChangeGroupSettings bool `json:"can_change_group_settings"`
	CanUploadContent       bool `json:"can_upload_content"`
	CanViewContent         bool `json:"can_view_content"`
	CanDownloadContent     bool `json:"can_download_content"`
}
