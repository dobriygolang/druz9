package slices

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestContains(t *testing.T) {
	s := []string{"a", "b", "c", "d", "e"}

	assert.True(t, Contains(s, "c"))
	assert.False(t, Contains(s, "z"))
	assert.True(t, Contains([]string{}, "a") == false)
}

func TestContainsSet(t *testing.T) {
	set := map[string]struct{}{
		"a": {},
		"b": {},
		"c": {},
	}

	assert.True(t, ContainsSet(set, "c"))
	assert.False(t, ContainsSet(set, "z"))
	assert.False(t, ContainsSet(nil, "a"))
}

func TestNewSet(t *testing.T) {
	s := []string{"a", "b", "c", "a", "b"}

	set := NewSet(s)

	assert.Len(t, set, 3)
	assert.True(t, ContainsSet(set, "a"))
	assert.True(t, ContainsSet(set, "b"))
	assert.True(t, ContainsSet(set, "c"))
	assert.False(t, ContainsSet(set, "d"))
}

func TestUnique(t *testing.T) {
	s := []string{"a", "b", "c", "a", "b", "d"}

	result := Unique(s)

	assert.Len(t, result, 4)
	assert.Equal(t, []string{"a", "b", "c", "d"}, result)
}

func TestMap(t *testing.T) {
	s := []int{1, 2, 3}

	result := Map(s, func(i int) int { return i * 2 })

	assert.Equal(t, []int{2, 4, 6}, result)
}

func TestFilter(t *testing.T) {
	s := []int{1, 2, 3, 4, 5}

	result := Filter(s, func(i int) bool { return i%2 == 0 })

	assert.Equal(t, []int{2, 4}, result)
}

func TestFindFirst(t *testing.T) {
	s := []int{1, 2, 3, 4, 5}

	val, ok := FindFirst(s, func(i int) bool { return i > 3 })

	assert.True(t, ok)
	assert.Equal(t, 4, val)

	_, ok = FindFirst(s, func(i int) bool { return i > 100 })
	assert.False(t, ok)
}

func TestGroupBy(t *testing.T) {
	s := []struct {
		Name string
		Age  int
	}{
		{"Alice", 25},
		{"Bob", 25},
		{"Charlie", 30},
	}

	result := GroupBy(s, func(v struct {
		Name string
		Age  int
	}) int { return v.Age })

	assert.Len(t, result, 2)
	assert.Len(t, result[25], 2)
	assert.Len(t, result[30], 1)
}

func TestKeys(t *testing.T) {
	m := map[string]int{
		"a": 1,
		"b": 2,
	}

	keys := Keys(m)

	assert.Len(t, keys, 2)
}

func TestValues(t *testing.T) {
	m := map[string]int{
		"a": 1,
		"b": 2,
	}

	values := Values(m)

	assert.Len(t, values, 2)
}

func TestReduce(t *testing.T) {
	s := []int{1, 2, 3, 4, 5}

	sum := Reduce(s, 0, func(acc, v int) int { return acc + v })

	assert.Equal(t, 15, sum)
}