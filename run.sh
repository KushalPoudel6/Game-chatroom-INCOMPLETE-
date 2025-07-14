#!/bin/bash
(cd frontend && npm run dev) & python3 backend/main.py
