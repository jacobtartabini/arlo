

## Current State

The Plaid integration is **fully implemented** across:
- **`plaid-api` edge function** — acts as the secure Plaid server (link tokens, token exchange, transaction sync, balance refresh, recurring detection, account removal)
- **`plaid-webhook` edge function** — receives Plaid webhook events with signature verification
- **`useFinancePersistence` hook** — client-side wrapper calling the edge function
- **`PlaidLinkButton` component** — triggers Plaid Link flow
- **Database tables** — `finance_linked_accounts`, `finance_transactions`, `finance_subscriptions`, etc.

All Plaid secrets (`PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_WEBHOOK_URL`) are already configured.

## The Problem

The only missing piece is the `PLAID_ENV` environment variable. Without it, the code defaults to Plaid **production**, which requires a fully approved Plaid application. For testing, it should be set to `sandbox` or `development`.

## Plan

### 1. Set the `PLAID_ENV` secret
- Add a `PLAID_ENV` secret with value `sandbox` (for testing with fake bank credentials) or `development` (for real bank connections with limited accounts)
- **Sandbox** is recommended to start — it uses test credentials (`user_good` / `pass_good`) and fake data

### 2. Set the webhook URL
- Verify `PLAID_WEBHOOK_URL` points to the correct edge function URL: `https://zovhwryzsujevrnakfcw.supabase.co/functions/v1/plaid-webhook`
- If it's wrong, update it

### 3. No code changes needed
- The entire Plaid flow (link → exchange → sync → display) is already wired up
- The `PlaidLinkButton` component calls `createLinkToken` → opens Plaid Link → calls `exchangePublicToken` → triggers initial transaction sync
- The Finance page displays accounts, transactions, subscriptions, and gift cards

### Summary for user
You already own and run your Plaid "server" — it's the `plaid-api` backend function in Lovable Cloud. No external hosting needed. The only step is setting `PLAID_ENV` to `sandbox` to start testing, then switching to `development` or `production` once your Plaid application is approved.

