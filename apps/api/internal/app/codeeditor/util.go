package codeeditor

import (
	"crypto/rand"
	"encoding/binary"
	"time"
)

func generateInviteCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 8)
	var num uint64
	for i := range b {
		if i == 0 {
			_ = binary.Read(rand.Reader, binary.LittleEndian, &num)
		}
		b[i] = chars[num%uint64(len(chars))]
		num >>= 6
	}
	return string(b)
}

func defaultCode() string {
	return `package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
`
}

func now() time.Time {
	return time.Now()
}
