export PATH := "./node_modules/.bin:" + env_var("PATH")

default:
	@just --list

compile:
	tsc --build

lint:
	eslint . .github --cache --cache-location "./target/eslintcache" --cache-strategy content --max-warnings 0

lint-fix:
	eslint --fix . .github

test-unit:
	node --test --test-isolation="none" source/**/*.test.ts

test: compile lint test-unit

publish-package args="": compile
	packtory publish {{ args }}
