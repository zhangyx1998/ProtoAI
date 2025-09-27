# ------------------------------------------------------
# Copyright (c) 2025 Yuxuan Zhang
# This source code is licensed under the MIT license.
# You may find the full license in project root directory.
# -------------------------------------------------------

build: configure
	@node scripts/make.cjs build

configure:
	@node scripts/make.cjs configure

clean:
	@node scripts/make.cjs clean
	@rm -rf .cache

app: build
	@cd .. && npx electron app

.PHONY: all configure clean app
