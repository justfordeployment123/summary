This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev

```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Structure

```
explain-my-letter/
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── README.md
├── test-aws.js
├── tsconfig.json
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── horizontal-logo.png
│   ├── logo-icon.png
│   ├── next.svg
│   ├── stacked-logo.png
│   ├── vercel.svg
│   └── window.svg
└── src/
    ├── proxy.ts
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── (public)/
    │   │   └── page.tsx
    │   ├── admin/
    │   │   ├── (dashboard)/
    │   │   │   ├── layout.tsx
    │   │   │   ├── dashboard/
    │   │   │   │   └── page.tsx
    │   │   │   ├── jobs/
    │   │   │   │   ├── page.tsx
    │   │   │   │   └── [id]/
    │   │   │   │       └── page.tsx
    │   │   │   ├── prompts/
    │   │   │   │   └── page.tsx
    │   │   │   └── settings/
    │   │   │       └── page.tsx
    │   │   ├── login/
    │   │   │   └── page.tsx
    │   │   ├── pricing/
    │   │   │   └── page.tsx
    │   │   └── upsells/
    │   │       └── page.tsx
    │   └── api/
    │       ├── admin/
    │       │   ├── auth/
    │       │   │   ├── login/
    │       │   │   │   └── route.ts
    │       │   │   ├── logout/
    │       │   │   │   └── route.ts
    │       │   │   ├── me/
    │       │   │   │   └── route.ts
    │       │   │   └── setup/
    │       │   │       └── route.ts
    │       │   ├── categories/
    │       │   │   ├── route.ts
    │       │   │   └── [id]/
    │       │   │       └── route.ts
    │       │   ├── cleanup/
    │       │   │   └── route.ts
    │       │   ├── dashboard/
    │       │   │   └── route.ts
    │       │   ├── jobs/
    │       │   │   ├── route.ts
    │       │   │   └── [id]/
    │       │   │       ├── route.ts
    │       │   │       ├── refund/
    │       │   │       │   └── route.ts
    │       │   │       └── regenerate/
    │       │   │           └── route.ts
    │       │   ├── prompts/
    │       │   │   ├── route.ts
    │       │   │   └── [id]/
    │       │   │       ├── route.ts
    │       │   │       └── versions/
    │       │   │           └── route.ts
    │       │   ├── settings/
    │       │   │   └── route.ts
    │       │   └── upsells/
    │       │       ├── route.ts
    │       │       └── [id]/
    │       │           └── route.ts
    │       ├── categories/
    │       │   └── route.ts
    │       ├── checkout/
    │       │   └── route.ts
    │       ├── create-payment-intent/
    │       │   └── route.ts
    │       ├── download/
    │       │   └── [format]/
    │       │       └── route.ts
    │       ├── generate-free/
    │       │   └── route.ts
    │       ├── generate-paid/
    │       │   ├── paidService.ts
    │       │   └── route.ts
    │       ├── jobs/
    │       │   └── [id]/
    │       │       └── status/
    │       │           └── route.ts
    │       ├── process/
    │       │   └── route.ts
    │       ├── upload/
    │       │   └── route.ts
    │       ├── upsells/
    │       │   └── route.ts
    │       └── webhook/
    │           └── route.ts
    ├── components/
    │   ├── admin/
    │   │   ├── AdminHeader.tsx
    │   │   └── AdminSidebar.tsx
    │   └── home/
    │       ├── cards.tsx
    │       ├── CTABannerAndFooter.tsx
    │       ├── FAQSection.tsx
    │       ├── GlobalStyles.tsx
    │       ├── HeroSection.tsx
    │       ├── HowItWorksSection.tsx
    │       ├── index.ts
    │       ├── Navbar.tsx
    │       ├── primitives.tsx
    │       ├── ResultViews.tsx
    │       ├── SummaryView.tsx
    │       └── UploadSection.tsx
    ├── lib/
    │   ├── adminApi.ts
    │   ├── api.ts
    │   ├── db.ts
    │   ├── homeUtils.ts
    │   └── tokenBudget.ts
    ├── models/
    │   ├── AdminUser.ts
    │   ├── Category.ts
    │   ├── Job.ts
    │   ├── JobPayment.ts
    │   ├── JobStateLog.ts
    │   ├── JobToken.ts
    │   ├── Prompt.ts
    │   ├── PromptVersion.ts
    │   ├── RegenerationLog.ts
    │   ├── Setting.ts
    │   ├── Temp.ts
    │   ├── Upsell.ts
    │   └── WebhookEvent.ts
    ├── services/
    │   └── jobService.ts
    └── types/
        ├── home.ts
        └── job.ts
```

## API Schema

### 1. Upload Initialization

**Endpoint:** `POST /api/upload`

**Request (UploadInitPayload):**

```typescript
{
    fileName: string;
    fileType: string;
    category: string;
    firstName: string;
    email: string;
    marketingConsent: boolean;
}
```

**Response (UploadInitResponse):**

```typescript
{
    presignedUrl: string;
    s3Key: string;
    jobId: string;
    accessToken: string;
}
```

**Description:** Initializes a new job and returns a presigned URL for uploading the file directly to S3.

---

### 2. OCR Processing

**Endpoint:** `POST /api/process`

**Request (OCRPayload):**

```typescript
{
    jobId: string;
    s3Key: string;
    fileType: string;
}
```

**Response (OCRResponse):**

```typescript
{
    message: string;
    extractedText: string;
    confidenceFlag: boolean;
}
```

**Description:** Triggers AWS Textract (for images) or PDF/DOCX parsers to extract text from the uploaded file. Returns extracted text and confidence metrics.

---

### 3. Free Summary Generation

**Endpoint:** `POST /api/generate-free`

**Request (GenerateFreePayload):**

```typescript
{
    jobId: string;
    extractedText: string;
}
```

**Response (GenerateFreeResponse):**

```typescript
{
    summary: string;
    urgency: string;
}
```

**Description:** Sends extracted text to OpenAI GPT-4 to generate a free summary (100-130 words) with urgency indicator.

---

### 4. Checkout Session Creation

**Endpoint:** `POST /api/checkout`

**Request (CheckoutPayload):**

```typescript
{
  jobId: string;
  upsells: string[];  // e.g., ["legal_formatting", "tone_rewrite"]
}
```

**Response:**

```typescript
{
    url: string;
}
```

**Description:** Creates a Stripe Checkout Session for premium features. Returns the hosted checkout URL.

---

### 5. Paid Summary Generation

**Endpoint:** `POST /api/generate-paid`

**Request (GeneratePaidPayload):**

```typescript
{
    jobId: string;
    extractedText: string;
}
```

**Response (GeneratePaidResponse):**

```typescript
{
    detailedBreakdown: string;
}
```

**Description:** After successful payment, generates a detailed breakdown using OpenAI GPT-4 with selected upsells applied.

---

### 6. Stripe Webhook

**Endpoint:** `POST /api/webhooks/stripe`

**Description:** Receives and verifies Stripe webhook events for payment confirmations. Triggers paid generation upon successful payment.

---

### 7. Admin Dashboard

**Endpoint:** `GET /api/admin/dashboard`

**Description:** Returns analytics and job statistics for the admin panel.

---

## Database Schema

### Job

Core collection storing job metadata and state.

```typescript
{
  _id: ObjectId;
  reference_id: string (unique);           // Public-facing job ID
  access_token: string (unique);           // UUID for secure access
  status: enum;                             // UPLOADED, OCR_PROCESSING, OCR_FAILED, FREE_SUMMARY_GENERATING, FREE_SUMMARY_COMPLETE, AWAITING_PAYMENT, PAYMENT_CONFIRMED, PAID_BREAKDOWN_GENERATING, COMPLETED
  category_id: string;                      // Reference to category
  user_email: string;                       // User's email
  user_name: string;                        // User's name
  marketing_consent: boolean;               // Marketing opt-in
  disclaimer_acknowledged: boolean;         // Payment disclaimer checkbox
  disclaimer_acknowledged_at: Date;         // When disclaimer was checked
  urgency: enum;                            // "Routine", "Important", "Time-Sensitive"
  previous_state: string;                   // Track state transitions
  state_transitioned_at: Date;              // Last state change timestamp
  createdAt: Date;                          // Auto-generated timestamp
  updatedAt: Date;                          // Auto-generated timestamp
}
```

---

### JobPayment

Stores payment and Stripe session details.

```typescript
{
  _id: ObjectId;
  job_id: ObjectId;                         // Reference to Job
  stripe_session_id: string;                // Stripe Checkout Session ID
  stripe_payment_intent_id: string;         // Stripe Payment Intent ID (optional)
  amount: number;                           // Amount in pennies (e.g., 499 for £4.99)
  currency: string;                         // Default: "gbp"
  status: enum;                             // "pending", "completed", "failed"
  upsells_purchased: [string];              // Array of upsell codes (e.g., ["legal_formatting"])
  created_at: Date;                         // Timestamp
}
```

---

### AdminUser

Admin credentials and roles.

```typescript
{
  _id: ObjectId;
  email: string (unique);                   // Admin email
  password_hash: string;                    // Bcrypt hashed password
  role: enum;                               // "superadmin", "editor", "support"
  last_login: Date;                         // Last login timestamp
  created_at: Date;                         // Account creation timestamp
}
```

---

### Category

Document categories for classification.

```typescript
{
    _id: ObjectId;
    name: string; // Display name (e.g., "Legal Notice")
    slug: string(unique); // URL-friendly name (e.g., "legal_notice")
    base_price: number; // Base price in pennies
    is_active: boolean; // Enable/disable category
    created_at: Date; // Creation timestamp
}
```

---

### Prompt

Dynamic prompt templates for AI generation.

```typescript
{
  _id: ObjectId;
  category_id: ObjectId;                    // Reference to Category (optional - null = generic)
  type: enum;                               // "free", "paid", "upsell"
  prompt_text: string;                      // Full prompt template
  version: number;                          // Version number for tracking
  is_active: boolean;                       // Active/inactive status
  updated_at: Date;                         // Last update timestamp
}
```

---

### JobStateLog

Audit trail of all state transitions.

```typescript
{
    _id: ObjectId;
    job_id: ObjectId; // Reference to Job
    from_state: string; // Previous state
    to_state: string; // New state
    triggered_by: string; // What triggered the transition (e.g., "api", "webhook")
    createdAt: Date; // Event timestamp
}
```

---

### Setting

Configuration key-value store for app settings.

```typescript
{
    _id: ObjectId;
    key: string(unique); // Setting key (e.g., "max_upload_size")
    value: any; // Setting value (string, number, or JSON)
    description: string; // Description of the setting
    updated_at: Date; // Last update timestamp
}
```

---

### WebhookEvent

Stripe webhook event log for idempotency and audit.

```typescript
{
    _id: ObjectId;
    stripe_event_id: string(unique); // Stripe event ID
    event_type: string; // Event type (e.g., "charge.succeeded")
    job_id: ObjectId; // Reference to Job (optional)
    processed_at: Date; // Processing timestamp
}
```

---

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

This is the most protected part of the app. The client explicitly requires that paid AI generation _never_ happens just because the user gets redirected to a "success" page. It must come from Stripe directly.

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

---

## Admin Requirements

### 1. Authentication & Access

- The admin logs into a secure web-based dashboard using an email and password
- This admin authentication is completely separate from the standard user flow
- The system enforces session expiry for security

### 2. Dashboard Alerts & Monitoring

**What is Shown:**

- Alert panel that flags jobs stuck in processing, webhook errors, or warnings if the monthly OpenAI cap is reached
- If the monthly API limit is reached or nearly reached, a prominent alert flag is displayed on the dashboard until the admin acknowledges it or resets the cap
- Recent event and error logs directly in the dashboard showing timestamp, event type, job ID, and severity level

### 3. Revenue, Cost & Token Tracking

**Revenue:**

- Overview of all-time earnings, current month's earnings, and breakdown by category

**Monthly API Costs:**

- Monthly summary showing total tokens used, total estimated costs, and a progress bar tracking usage against the monthly cap
- Month-by-month historical summary of token usage and costs

### 4. Managing Categories, Pricing & Upsells

**Categories:**

- Initial list of document categories (like Legal, Medical, etc.) is expandable via the admin

**Pricing:**

- Admin can configure the base price for the paid breakdown on a per-category basis

**Upsells:**

- Admin can add, edit, disable, and assign upsell options (like "Tone Rewrite") to specific document categories
- Admin sets the individual pricing for each upsell per category

### 5. Managing Jobs & Leads

- View a list of all jobs and filter by category, status, and date range
- Inspect deep details for any specific job, including user info, file metadata, state history audit log, token usage, cost estimates, and urgency indicator
- View the full state history of any job to help with debugging
- View the captured first name and email address for each job
- Export capability to export lead data

### 6. Handling Failures & Refunds

**Regenerate:**

- If a job fails after payment is confirmed, admin is shown a "Regenerate" button to manually retry the AI generation
- Each attempt is logged with admin ID and timestamp

**Refunds:**

- Admin can issue a refund using a one-click shortcut to the Stripe API from the dashboard
- Issuing a refund automatically updates the job status to REFUNDED and revokes the user's ability to download the documents

### 7. Configuring AI Behavior & System Rules

**Prompts:**

- Admin can edit the AI prompt templates for both the free summary and the paid breakdown for every individual category
- Prompts are versioned, allowing the admin to roll back to previous versions

**Limits & Configuration:**

- Configure the global monthly OpenAI spend/token cap, as well as the maximum input and output tokens allowed per request
- Manually reset the monthly token cap ahead of its automatic reset schedule
- Configure the exact percentage (defaulting to 80%) at which the system sends automated warning email about API usage
- Change the OpenAI GPT-4.1 model version
- Adjust the AWS Textract OCR confidence thresholds (e.g., changing the default 85% flag or 70% reject limits)
- Configure the exact text shown in the pre-payment legal disclaimer and the mandatory acknowledgement checkbox
- Configure how long download links remain active before expiring (defaulting to 72 hours)
- Trigger or schedule the cleanup/deletion of job metadata and adjust how long token usage logs are retained
