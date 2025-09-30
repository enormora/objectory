export PATH := "./node_modules/.bin:" + env_var("PATH")

default:
	@just --list

compile:
	tsc --build

lint:
	prettier --check .
	eslint . --cache --cache-location "./target/eslintcache" --cache-strategy content --max-warnings 0

lint-fix:
	prettier --log-level warn --write .
	eslint --fix .

test-unit:
	node --test source/**/*.test.ts

test: compile lint test-unit
