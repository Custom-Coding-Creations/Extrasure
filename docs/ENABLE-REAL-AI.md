# Enable Real AI Responses

## Current State: Using Fallback Logic ⚠️

Without an OpenAI API key configured, **all AI responses are using preset/fallback logic**:

### AI Chat Fallback Behavior
- Matches user input against internal FAQs and service descriptions
- Returns canned responses based on keyword patterns
- **NOT using actual AI language models**

### AI Triage Fallback Behavior  
- Uses simple keyword detection patterns:
  - "dropping", "mouse", "rat" → "Rodent activity" (confidence: 0.62)
  - "termite", "wood damage" → "Possible termite activity" (confidence: 0.62)
  - "bed bug", "bites" → "Possible bed bug activity" (confidence: 0.62)
  - Everything else → "General pest activity" (confidence: 0.48)
- **NOT using actual AI models**

See: [`src/lib/ai-triage.ts#buildDeterministicTriageFallback()`](../src/lib/ai-triage.ts)

---

## How to Enable Real AI

### Step 1: Get an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-`)
5. **Important**: Keep this key secure and never commit it to git!

### Step 2: Configure Environment Variables

I've already added the configuration structure to your environment files. Now you need to add your actual API key:

#### Local Development (.env.local)

```bash
# Replace YOUR_OPENAI_API_KEY_HERE with your actual key
OPENAI_API_KEY=sk-your-actual-key-here
AI_CHAT_MODEL=gpt-4o-mini
AI_TRIAGE_MODEL=gpt-4o-mini
```

#### Production (.env)

```bash
# Replace YOUR_OPENAI_API_KEY_HERE with your actual key  
OPENAI_API_KEY=sk-your-actual-key-here
AI_CHAT_MODEL=gpt-4o-mini
AI_TRIAGE_MODEL=gpt-4o-mini
```

#### Vercel Production Deployment

You also need to add the environment variable to Vercel:

1. Go to https://vercel.com/coding-krakken-projects/extrasure-project/settings/environment-variables
2. Add a new environment variable:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key (starts with `sk-`)
   - **Environment**: Production, Preview, and Development
3. Optional but recommended:
   - **Name**: `AI_CHAT_MODEL`
   - **Value**: `gpt-4o-mini`
   - **Environment**: All
4. Optional but recommended:
   - **Name**: `AI_TRIAGE_MODEL`
   - **Value**: `gpt-4o-mini`
   - **Environment**: All
5. Redeploy your application

### Step 3: Update Your API Key

Open `.env.local` in your editor:

```bash
code .env.local
```

Replace `YOUR_OPENAI_API_KEY_HERE` with your actual OpenAI API key.

Do the same for `.env` if you're deploying directly from this machine.

### Step 4: Restart Your Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 5: Verify Real AI is Working

Test the AI features and check the console/network tab:

**AI Chat Test:**
1. Open the chat widget on your site
2. Ask a question like "What pests are common in summer?"
3. Check the browser console - you should see real AI-generated responses
4. The response should be conversational, not just regurgitated FAQ text

**AI Triage Test:**
1. Go to the booking form
2. Describe a pest issue in the triage section
3. Check the console network tab for `/api/ai/triage` response
4. Look for `"usedFallback": false` in the response JSON
5. The confidence scores should be more varied (not just 0.48 or 0.62)
6. The pest identification should be specific and context-aware

---

## Model Options

### Recommended Models (May 2026)

- **gpt-4o-mini**: Fast, cost-effective, good quality (recommended for production)
- **gpt-4o**: Higher quality, slower, more expensive
- **gpt-4-turbo**: Balance of quality and speed

### Cost Considerations

- **gpt-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Typical chat interaction: ~500 tokens = ~$0.0004 per chat
- Typical triage assessment: ~800 tokens = ~$0.0006 per assessment

At these rates, 10,000 interactions would cost approximately $4-6.

---

## Troubleshooting

### Still Seeing Fallback Responses?

1. **Check the API key is set correctly** in your environment:
   ```bash
   echo $OPENAI_API_KEY
   ```
   Should output your key starting with `sk-`

2. **Verify the environment variable is loaded**:
   - Add a console log in `src/app/api/ai/chat/route.ts`:
     ```ts
     console.log('OpenAI API key configured:', !!process.env.OPENAI_API_KEY);
     ```
   - Restart server and check console

3. **Check for API errors** in server logs:
   - OpenAI rate limits
   - Invalid API key
   - Network issues

4. **Test the API key directly**:
   ```bash
   curl https://api.openai.com/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_OPENAI_API_KEY_HERE" \
     -d '{
       "model": "gpt-4o-mini",
       "messages": [{"role": "user", "content": "Hello!"}]
     }'
   ```

### Response Still Looks Like FAQ Text?

The AI is trained to use the internal knowledge base (FAQs, services) as context, so responses may reference that content. However, with real AI enabled:
- Responses will be **more conversational**
- Can **synthesize information** from multiple FAQs
- Will **adapt tone and language** to the user's question
- Can **handle questions not directly in the FAQ**

---

## Security Best Practices

1. **Never commit API keys to git**
   - `.env` and `.env.local` are already in `.gitignore`
   - Double-check before committing

2. **Use environment-specific keys**
   - Development key for local testing
   - Production key for Vercel deployment
   - Different keys for staging/preview environments

3. **Set spending limits** in OpenAI dashboard:
   - https://platform.openai.com/account/billing/limits
   - Recommended: Start with $10-20/month limit

4. **Monitor usage**:
   - https://platform.openai.com/account/usage
   - Check daily to detect unexpected spikes

---

## Files Modified

✅ `.env` - Added OpenAI configuration section  
✅ `.env.local` - Added OpenAI configuration  
✅ `.env.example` - Documented AI variables for future reference  

## Next Steps

1. Get your OpenAI API key
2. Update `.env.local` with real key
3. Restart dev server  
4. Test chat and triage features
5. Add key to Vercel environment variables
6. Deploy to production

---

For questions or issues, see the [README](../README.md) AI configuration section.
