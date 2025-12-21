package ws

import "sync"

var (
	hubs   = make(map[int]*Hub)
	hubsMu sync.Mutex
)

func GetHub(groupID int) *Hub {
	hubsMu.Lock()
	defer hubsMu.Unlock()
	h, ok := hubs[groupID]
	if !ok {
		h = NewHub()
		hubs[groupID] = h
		go h.Run()
	}
	return h
}
