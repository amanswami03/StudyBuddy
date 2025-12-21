package ws

import (
	"encoding/json"
)

type Message struct {
	GroupID string
	Data    []byte
	UserID  int
}

type Hub struct {
	Clients         map[string]map[*Client]bool // GroupID → set of clients
	Broadcast       chan Message
	Register        chan *Client
	Unregister      chan *Client
	SaveMessageFunc func(msg Message) error
}

func NewHub() *Hub {
	return &Hub{
		Broadcast:  make(chan Message),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Clients:    make(map[string]map[*Client]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			if _, ok := h.Clients[client.GroupID]; !ok {
				h.Clients[client.GroupID] = make(map[*Client]bool)
			}
			h.Clients[client.GroupID][client] = true

		case client := <-h.Unregister:
			if clients, ok := h.Clients[client.GroupID]; ok {
				if _, exists := clients[client]; exists {
					delete(clients, client)
					close(client.Send)
				}
				if len(clients) == 0 {
					delete(h.Clients, client.GroupID)
				}
			}

		case message := <-h.Broadcast:
			// Save message to DB
			if h.SaveMessageFunc != nil {
				_ = h.SaveMessageFunc(message)
			}

			// Enrich message with sender_id before broadcasting to clients
			var msgObj map[string]interface{}
			if err := json.Unmarshal(message.Data, &msgObj); err == nil {
				msgObj["sender_id"] = message.UserID
				enriched, _ := json.Marshal(msgObj)
				message.Data = enriched
			}

			// Broadcast to all connected clients
			if clients, ok := h.Clients[message.GroupID]; ok {
				for client := range clients {
					select {
					case client.Send <- message.Data:
					default:
						close(client.Send)
						delete(clients, client)
					}
				}
			}

		}
	}
}
