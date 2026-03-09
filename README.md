This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Structure

```
explain-my-letter/
├── src/
│   └── app/
│       ├── favicon.ico
│       ├── globals.css
│       ├── layout.tsx
│       └── page.tsx
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── .gitignore
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── tsconfig.json
└── README.md
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Application Flow

**Phase 1: The Request (Frontend)**
The user selects a category, enters their email, picks a file, and clicks "Submit".

**Phase 2: The Handshake (Your API)**
The frontend sends file details to `/api/upload`. Your backend validates, creates a Job in MongoDB with state `UPLOADED`, and requests a Presigned URL from AWS.

**Phase 3: The Heavy Lift (Client to S3)**
The frontend uploads the file directly to S3 using the Presigned URL, bypassing your server.

**Phase 4: The Extraction (Textract)**
The frontend calls `/api/process`. Your backend instructs AWS Textract to read the S3 file and returns the raw text.

**Phase 5: The AI Generation (OpenAI)**
Your backend enforces the 1,200-word limit and sends text to GPT-4 with the "Free Summary Prompt".

**Phase 6: The Result**
OpenAI returns a 100-130 word summary and urgency indicator. Your backend saves to database, updates job state to `FREE_SUMMARY_COMPLETE`, and returns the result to the frontend.





Mapping out the entire lifecycle from start to finish is the absolute best way to understand the system architecture. It removes all the guesswork.

Here is the complete, end-to-end data flow based strictly on the requirements document. It is broken down into four distinct phases so you can see exactly how the states transition and where the external APIs come in.

### Phase 1: Upload & The Free Summary Engine

This is the phase we have been working on—getting the user in the door and delivering the initial free value.

```
Frontend: User inputs Category, Name, Email, and selects File [cite: 15]
        │
        ▼
POST `/api/upload`
        │
        ▼
Server validates file (MIME type & Magic Bytes) and limits size to 10MB [cite: 24, 30, 33]
        │
        ▼
Server generates a secure UUID for the S3 Key [cite: 39]
        │
        ▼
Server asks AWS for an S3 Presigned URL [cite: 41]
        │
        ▼
Server creates Job in Database → State: `UPLOADED` [cite: 66]
        │
        ▼
Server returns Presigned URL to Frontend
        │
        ▼
Frontend uploads file directly to AWS S3 bucket [cite: 41]
        │
        ▼
Server triggers OCR (AWS Textract for images / Parser for PDFs) → State: `OCR_PROCESSING` [cite: 15, 66]
        │
        ▼
OCR validates extraction confidence (must be ≥ 70% or file is rejected) [cite: 57]
        │
        ▼
Server sends text (capped at 1,200 words) to OpenAI GPT-4.1 → State: `FREE_SUMMARY_GENERATING` [cite: 66, 118]
        │
        ▼
OpenAI returns a 100-130 word summary + Urgency Indicator [cite: 15, 143]
        │
        ▼
Server saves summary to Database → State: `FREE_SUMMARY_COMPLETE` [cite: 66]
        │
        ▼
Frontend displays Free Summary to User [cite: 66]

```

---

### Phase 2: The Upsell & Payment

Once the user sees the free summary, the system tries to convert them into a paying customer.

```
Frontend displays Disclaimer Banner & mandatory Acknowledgement Checkbox [cite: 149, 157]
        │
        ▼
User selects optional Upsells (e.g., Tone Rewrite, Legal Formatting) [cite: 180, 181]
        │
        ▼
User checks the disclaimer box and clicks "Get Detailed Breakdown"
        │
        ▼
Server verifies disclaimer is checked and generates Stripe Checkout Session [cite: 172, 175]
        │
        ▼
Server updates Job in Database → State: `AWAITING_PAYMENT` [cite: 66]
        │
        ▼
User completes payment on the hosted Stripe Checkout page [cite: 15, 171]

```

---

### Phase 3: The Secure Webhook & Paid Generation

This is the most protected part of the app. The client explicitly requires that paid AI generation *never* happens just because the user gets redirected to a "success" page. It must come from Stripe directly.

```
Stripe successfully processes payment and sends Webhook to `/api/webhooks/stripe` [cite: 83, 90]
        │
        ▼
Server verifies Stripe signature & checks DB for Idempotency (prevents duplicate triggers) [cite: 79, 90]
        │
        ▼
Server securely locks Payment Status → State: `PAYMENT_CONFIRMED` [cite: 66, 79]
        │
        ▼
Server sends full text + Paid Prompt + Upsells to OpenAI GPT-4.1 → State: `PAID_BREAKDOWN_GENERATING` [cite: 69]
        │
        ▼
OpenAI returns the full, structured breakdown (Retry logic applies if it fails) [cite: 69, 96]
        │
        ▼
Server generates a branded PDF (with disclaimer footer), DOCX, and TXT outputs [cite: 18, 69, 164]
        │
        ▼
Server updates Job in Database → State: `COMPLETED` [cite: 69]

```

---

### Phase 4: Secure Download & Auto-Cleanup

The final delivery of the files and the required security cleanup.

```
Frontend (polling the server) sees state is COMPLETED and displays Download Buttons [cite: 85, 184]
        │
        ▼
User clicks Download → Server verifies the Job's UUID Token AND that Payment is confirmed [cite: 93]
        │
        ▼
Server serves the protected files (Download links expire after 72 hours) [cite: 93]
        │
        ▼
AWS S3 automatically deletes the originally uploaded file within 24 hours [cite: 42]

```

---

Looking at it laid out like this, you can see that the State Machine we discussed earlier (`UPLOADED`, `OCR_PROCESSING`, `AWAITING_PAYMENT`, etc.) acts as the spine of the entire application.

Would you like to move on to Step 4 of Phase 1 and write the `/api/process` endpoint that triggers AWS Textract and transitions the state to `OCR_PROCESSING`?