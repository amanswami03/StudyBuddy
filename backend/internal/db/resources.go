package db

import (
	"time"
)

// GroupResource represents a resource shared in a group
type GroupResource struct {
	ID            int       `json:"id"`
	GroupID       int       `json:"group_id"`
	UploadedBy    int       `json:"uploaded_by"`
	UploadedByName string   `json:"uploaded_by_name,omitempty"`
	Filename      string    `json:"filename"`
	FilePath      string    `json:"file_path"`
	FileSize      int64     `json:"file_size"`
	MimeType      string    `json:"mime_type"`
	DownloadCount int       `json:"download_count"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// CreateGroupResource saves a new resource to the database
func CreateGroupResource(groupID int, uploadedBy int, filename string, filePath string, fileSize int64, mimeType string) (int, error) {
	var resourceID int
	err := DB.QueryRow(`
		INSERT INTO group_resources (group_id, uploaded_by, filename, file_path, file_size, mime_type)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, groupID, uploadedBy, filename, filePath, fileSize, mimeType).Scan(&resourceID)
	
	return resourceID, err
}

// GetGroupResources retrieves all resources for a group
func GetGroupResources(groupID int) ([]GroupResource, error) {
	rows, err := DB.Query(`
		SELECT 
			r.id, r.group_id, r.uploaded_by, u.username, r.filename, r.file_path,
			r.file_size, r.mime_type, r.download_count, r.created_at, r.updated_at
		FROM group_resources r
		LEFT JOIN users u ON r.uploaded_by = u.id
		WHERE r.group_id = $1
		ORDER BY r.created_at DESC
	`, groupID)
	
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var resources []GroupResource
	for rows.Next() {
		var resource GroupResource
		err := rows.Scan(
			&resource.ID, &resource.GroupID, &resource.UploadedBy, &resource.UploadedByName,
			&resource.Filename, &resource.FilePath, &resource.FileSize, &resource.MimeType,
			&resource.DownloadCount, &resource.CreatedAt, &resource.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		resources = append(resources, resource)
	}
	
	return resources, rows.Err()
}

// IncrementResourceDownloadCount increments the download count for a resource
func IncrementResourceDownloadCount(resourceID int) error {
	_, err := DB.Exec(`
		UPDATE group_resources
		SET download_count = download_count + 1
		WHERE id = $1
	`, resourceID)
	return err
}

// DeleteGroupResource deletes a resource by ID
func DeleteGroupResource(resourceID int) error {
	_, err := DB.Exec(`
		DELETE FROM group_resources
		WHERE id = $1
	`, resourceID)
	return err
}
