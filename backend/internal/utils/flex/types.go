package flex

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

type Float64 float64

func (f *Float64) UnmarshalJSON(data []byte) error {
	var v interface{}
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}

	switch val := v.(type) {
	case float64:
		*f = Float64(val)
	case string:
		s := strings.TrimSpace(val)
		if s == "" {
			*f = 0
			return nil
		}
		parsed, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return fmt.Errorf("invalid float64 value: %q", val)
		}
		*f = Float64(parsed)
	case nil:
		*f = 0
	default:
		return fmt.Errorf("invalid type for float64: %T", v)
	}
	return nil
}

func (f Float64) MarshalJSON() ([]byte, error) {
	return json.Marshal(float64(f))
}

func (f Float64) Value() float64 {
	return float64(f)
}

type Int int

func (i *Int) UnmarshalJSON(data []byte) error {
	var v interface{}
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}

	switch val := v.(type) {
	case float64:
		*i = Int(int(val))
	case string:
		s := strings.TrimSpace(val)
		if s == "" {
			*i = 0
			return nil
		}
		parsed, err := strconv.Atoi(s)
		if err != nil {
			return fmt.Errorf("invalid int value: %q", val)
		}
		*i = Int(parsed)
	case nil:
		*i = 0
	default:
		return fmt.Errorf("invalid type for int: %T", v)
	}
	return nil
}

func (i Int) MarshalJSON() ([]byte, error) {
	return json.Marshal(int(i))
}

func (i Int) Value() int {
	return int(i)
}

type Uint uint

func (u *Uint) UnmarshalJSON(data []byte) error {
	var v interface{}
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}

	switch val := v.(type) {
	case float64:
		if val < 0 {
			return fmt.Errorf("invalid uint value: %f (negative)", val)
		}
		*u = Uint(uint(val))
	case string:
		s := strings.TrimSpace(val)
		if s == "" {
			*u = 0
			return nil
		}
		parsed, err := strconv.ParseUint(s, 10, 64)
		if err != nil {
			return fmt.Errorf("invalid uint value: %q", val)
		}
		*u = Uint(uint(parsed))
	case nil:
		*u = 0
	default:
		return fmt.Errorf("invalid type for uint: %T", v)
	}
	return nil
}

func (u Uint) MarshalJSON() ([]byte, error) {
	return json.Marshal(uint(u))
}

func (u Uint) Value() uint {
	return uint(u)
}

type Bool bool

func (b *Bool) UnmarshalJSON(data []byte) error {
	var v interface{}
	if err := json.Unmarshal(data, &v); err != nil {
		return err
	}

	switch val := v.(type) {
	case bool:
		*b = Bool(val)
	case string:
		s := strings.TrimSpace(strings.ToLower(val))
		switch s {
		case "", "null":
			*b = false
		case "true", "1", "yes", "on":
			*b = true
		case "false", "0", "no", "off":
			*b = false
		default:
			return fmt.Errorf("invalid bool value: %q", val)
		}
	case float64:
		*b = Bool(val != 0)
	case nil:
		*b = false
	default:
		return fmt.Errorf("invalid type for bool: %T", v)
	}
	return nil
}

func (b Bool) MarshalJSON() ([]byte, error) {
	return json.Marshal(bool(b))
}

func (b Bool) Value() bool {
	return bool(b)
}

func (b *Bool) Ptr() *bool {
	v := bool(*b)
	return &v
}
