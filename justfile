export PATH := "./node_modules/.bin:" + env_var("PATH")

default:
	@just --list

compile:
	tsc --build
