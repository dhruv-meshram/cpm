#!/usr/bin/env python3
import sys
import json

def main():
    if len(sys.argv) < 3:
        print("Usage: validate_schema.py <input.json> <schema.json>")
        return 2

    input_path = sys.argv[1]
    schema_path = sys.argv[2]

    with open(input_path, 'r') as f:
        data = json.load(f)
    with open(schema_path, 'r') as f:
        schema = json.load(f)

    try:
        import jsonschema
    except Exception:
        print("jsonschema package not found. Install with: pip install jsonschema")
        return 3

    try:
        jsonschema.validate(instance=data, schema=schema)
        print(f"OK: {input_path} validates against {schema_path}")
        return 0
    except Exception as e:
        print(f"VALIDATION ERROR: {e}")
        return 4

if __name__ == '__main__':
    sys.exit(main())
