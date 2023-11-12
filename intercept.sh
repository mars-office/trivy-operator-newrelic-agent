#!/bin/sh
telepresence connect -n trivy-operator-newrelic-agent
telepresence intercept trivy-operator-newrelic-agent-trivy-operator-newrelic-agent --port 5001:http --env-file ./.env || true
