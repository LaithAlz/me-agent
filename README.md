# Me-Agent

A shopping agent that cannot spend your money outside the rules you set for it.

Built at UofTHacks 2025. The idea is that an autonomous agent acting on your
behalf needs a boundary that it does not get to negotiate, so authority is a
separate layer from reasoning rather than a line in a prompt.

## Architecture

Three layers, deliberately kept apart:

| Layer | Responsibility |
|---|---|
| **Memory** | Who the user is, their preferences and history |
| **Reasoning** | The agent proposing an action (a cart, a bundle, a checkout) |
| **Authority** | Deciding whether that action is permitted, in code |

The agent never acts directly. Every action it proposes goes through one
enforcement endpoint:

```
POST /authority/check
{ "action": "checkoutStart", "cartTotal": 240.00, "categories": ["electronics"], "items": [...] }
```

`action` is a closed set: `addToCart`, `cartCreate`, `recommendBundle`,
`checkoutStart`. The user's stored policy decides, and the answer is a hard
allow or deny. Because the check is a typed Pydantic schema and not part of the
prompt, the model cannot talk its way past a spend limit or an excluded
category.

Every decision, allowed or denied, is written to an audit log.

## Identity

Auth is WebAuthn, so the policy is bound to a hardware-backed credential rather
than a password the agent could read out of its own context.

## Layout

```
backend/   FastAPI · MongoDB · routers: auth, policy, authority, audit, agent, voice, avatar, shopify
frontend/  React · Vite · TypeScript · Tailwind · shadcn/ui
```

Shopify is the commerce backend the agent acts against. Voice and avatar are the
conversational front end.

## Running it

```bash
cd backend && pip install -r requirements.txt && python run.py
cd frontend && bun install && bun run dev
```

The backend needs `MONGO_URI` and `MONGO_DB_NAME` in the environment. It falls
back to an in-memory store when `MONGO_URI` is unset, so it runs without a
database for local work.
