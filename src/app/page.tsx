"use client";

import { useState } from "react";

export default function Home() {
  const [category, setCategory] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // The exact categories required by the specifications
  const categories = [
    "Legal",
    "Medical/NHS",
    "Government/HMRC/DWP",
    "Financial / Banking",
    "Housing / Landlord / Council",
    "Employment / HR",
    "Insurance",
    "General / Other"
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Client-side validation for the 10MB limit
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !category || !firstName || !email) {
      alert("Please fill out all required fields and upload a file.");
      return;
    }

    console.log("Form ready for API integration:", { category, firstName, email, marketingConsent, file });
    // Next step: Call the presigned URL API and upload the file to S3
  };

  return (
    <div className="max-w-2xl mx-auto mt-12 p-6 bg-white shadow-lg rounded-xl border border-gray-100">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Upload Your Letter</h1>
        <p className="text-gray-600">Get a plain-English summary instantly.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Category Selection */}
        <div>
          <label className="block text-sm font-bold mb-2">Letter Type *</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
            required
          >
            <option value="" disabled>Select a category...</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Step 2: Lead Capture */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-2">First Name *</label>
            <input 
              type="text" 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-teal"
              placeholder="e.g. John"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Email Address *</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-teal"
              placeholder="john@example.com"
              required 
            />
          </div>
        </div>

        <div className="flex items-center">
          <input 
            type="checkbox" 
            id="marketing" 
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="mr-2 h-4 w-4 text-brand-teal focus:ring-brand-teal border-gray-300 rounded"
          />
          <label htmlFor="marketing" className="text-sm text-gray-600">
            I agree to receive marketing updates (optional)
          </label>
        </div>

        {/* Step 3: File Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-brand-teal transition-colors">
          <input 
            type="file" 
            id="file-upload" 
            className="hidden" 
            onChange={handleFileChange}
            accept=".pdf,.docx,.jpg,.jpeg,.png"
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <span className="text-brand-darkTeal font-bold mb-2">
              {file ? file.name : "Click to upload your document"}
            </span>
            <span className="text-xs text-gray-500">
              PDF, DOCX, JPG, or PNG up to 10MB
            </span>
          </label>
        </div>

        <button 
          type="submit" 
          className="w-full bg-brand-teal hover:bg-brand-darkTeal text-white font-bold py-4 rounded-lg transition-colors"
        >
          Generate Free Summary
        </button>
      </form>
    </div>
  );
}